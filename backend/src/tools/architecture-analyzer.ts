/**
 * Architecture Analyzer - 4가지 핵심 원칙 검증 도구
 * @description 아키텍처, 플러그인, 모듈화, 느슨한 결합 검증
 */

import fs from 'fs';
import path from 'path';
import { glob as globCallback } from 'glob';
import { promisify } from 'util';

const glob = promisify(globCallback);

interface ArchitectureAnalysis {
  architecture: ArchitectureScore;
  plugins: PluginScore;
  modularity: ModularityScore;
  looseCoupling: LooseCouplingScore;
  overallScore: number;
  recommendations: string[];
}

interface ArchitectureScore {
  score: number;
  details: {
    layerSeparation: number;
    dependencyDirection: number;
    domainPurity: number;
  };
  violations: string[];
}

interface PluginScore {
  score: number;
  details: {
    interfaceBasedDesign: number;
    replaceability: number;
    extensibility: number;
  };
  plugins: string[];
}

interface ModularityScore {
  score: number;
  details: {
    cohesion: number;
    coupling: number;
    singleResponsibility: number;
  };
  modules: ModuleInfo[];
}

interface LooseCouplingScore {
  score: number;
  details: {
    dependencyInversion: number;
    interfaceSegregation: number;
    circularDependencies: number;
  };
  issues: string[];
}

interface ModuleInfo {
  name: string;
  path: string;
  imports: string[];
  exports: string[];
  responsibilities: number;
  cyclomaticComplexity: number;
}

export class ArchitectureAnalyzer {
  private srcPath: string;
  
  constructor(srcPath: string = './src') {
    this.srcPath = path.resolve(srcPath);
    console.log('🔍 Analyzing path:', this.srcPath);
  }

  /**
   * 전체 아키텍처 분석 실행
   */
  async analyze(): Promise<ArchitectureAnalysis> {
    console.log('🔍 Starting architecture analysis...');
    
    const architecture = await this.analyzeArchitecture();
    const plugins = await this.analyzePlugins();
    const modularity = await this.analyzeModularity();
    const looseCoupling = await this.analyzeLooseCoupling();
    
    const overallScore = Math.round(
      (architecture.score + plugins.score + modularity.score + looseCoupling.score) / 4
    );
    
    const recommendations = this.generateRecommendations({
      architecture, plugins, modularity, looseCoupling, overallScore, recommendations: []
    });
    
    return {
      architecture,
      plugins, 
      modularity,
      looseCoupling,
      overallScore,
      recommendations
    };
  }

  /**
   * 1. 아키텍처 원칙 검증 (Clean Architecture)
   */
  private async analyzeArchitecture(): Promise<ArchitectureScore> {
    const violations: string[] = [];
    let layerSeparation = 100;
    let dependencyDirection = 100;
    let domainPurity = 100;

    try {
      // 계층 분리 검사
      const hasDomainLayer = fs.existsSync(path.join(this.srcPath, 'domain'));
      const hasAdaptersLayer = fs.existsSync(path.join(this.srcPath, 'adapters'));
      const hasPortsPattern = fs.existsSync(path.join(this.srcPath, 'domain/ports'));
      
      if (!hasDomainLayer) {
        violations.push('Missing domain layer');
        layerSeparation -= 30;
      }
      
      if (!hasAdaptersLayer) {
        violations.push('Missing adapters layer');
        layerSeparation -= 30;
      }
      
      if (!hasPortsPattern) {
        violations.push('Missing ports pattern');
        dependencyDirection -= 40;
      }

      // 의존성 방향 검사 (도메인 → 인프라 의존성 금지)
      const domainFiles = await glob(`${this.srcPath}/domain/**/*.ts`);
      
      for (const file of domainFiles) {
        const content = fs.readFileSync(file, 'utf8');
        
        // 도메인이 인프라에 의존하는지 검사
        if (content.includes("import") && 
           (content.includes("../adapters") || 
            content.includes("../config") ||
            content.includes("../services"))) {
          violations.push(`Domain dependency violation in ${file}`);
          dependencyDirection -= 20;
        }
        
        // 도메인 순수성 검사
        if (content.includes("require(") || 
            content.includes("import express") ||
            content.includes("import firebase")) {
          violations.push(`Domain purity violation in ${file}`);
          domainPurity -= 20;
        }
      }

    } catch (error) {
      violations.push(`Architecture analysis error: ${error}`);
    }

    const score = Math.max(0, Math.round((layerSeparation + dependencyDirection + domainPurity) / 3));
    
    return {
      score,
      details: {
        layerSeparation: Math.max(0, layerSeparation),
        dependencyDirection: Math.max(0, dependencyDirection), 
        domainPurity: Math.max(0, domainPurity)
      },
      violations
    };
  }

  /**
   * 2. 플러그인 구조 검증
   */
  private async analyzePlugins(): Promise<PluginScore> {
    const plugins: string[] = [];
    let interfaceBasedDesign = 0;
    let replaceability = 0;
    let extensibility = 0;

    try {
      // 포트 인터페이스 검사
      const portsFiles = await glob(`${this.srcPath}/domain/ports/*.ts`);
      interfaceBasedDesign = Math.min(100, portsFiles.length * 20); // 각 포트당 20점
      
      // 어댑터 구현체 검사
      const adaptersFiles = await glob(`${this.srcPath}/adapters/**/*.ts`);
      
      for (const adapterFile of adaptersFiles) {
        const content = fs.readFileSync(adapterFile, 'utf8');
        
        // implements 패턴 검사
        if (content.includes('implements ') && content.includes('Port')) {
          plugins.push(path.basename(adapterFile, '.ts'));
          replaceability += 15; // 각 어댑터당 15점
        }
      }
      
      // 확장 가능성 검사 (DI 컨테이너, 팩토리 패턴)
      const containerExists = fs.existsSync(path.join(this.srcPath, 'container'));
      const hasFactoryPattern = await this.checkForFactoryPattern();
      
      if (containerExists) extensibility += 40;
      if (hasFactoryPattern) extensibility += 30;
      
      // 플러그인 로더 패턴 검사
      const hasPluginLoader = await this.checkForPluginLoader();
      if (hasPluginLoader) extensibility += 30;

    } catch (error) {
      console.error('Plugin analysis error:', error);
    }

    const score = Math.min(100, Math.round((interfaceBasedDesign + replaceability + extensibility) / 3));
    
    return {
      score,
      details: {
        interfaceBasedDesign: Math.min(100, interfaceBasedDesign),
        replaceability: Math.min(100, replaceability),
        extensibility: Math.min(100, extensibility)
      },
      plugins
    };
  }

  /**
   * 3. 모듈화 검증
   */
  private async analyzeModularity(): Promise<ModularityScore> {
    const modules: ModuleInfo[] = [];
    let totalCohesion = 0;
    let totalCoupling = 0;
    let totalSRP = 0;

    try {
      const tsFiles = await glob(`${this.srcPath}/**/*.ts`);
      
      for (const file of tsFiles) {
        const moduleInfo = await this.analyzeModule(file);
        modules.push(moduleInfo);
        
        // 응집도 계산 (낮은 책임 수 = 높은 응집도)
        const cohesion = Math.max(0, 100 - (moduleInfo.responsibilities - 1) * 20);
        totalCohesion += cohesion;
        
        // 결합도 계산 (적은 import = 낮은 결합도)
        const coupling = Math.max(0, 100 - moduleInfo.imports.length * 5);
        totalCoupling += coupling;
        
        // 단일 책임 원칙 (복잡도 기반)
        const srp = Math.max(0, 100 - moduleInfo.cyclomaticComplexity * 2);
        totalSRP += srp;
      }
      
      const moduleCount = modules.length;
      
      return {
        score: Math.round((totalCohesion + totalCoupling + totalSRP) / (moduleCount * 3) * 100),
        details: {
          cohesion: Math.round(totalCohesion / moduleCount),
          coupling: Math.round(totalCoupling / moduleCount),
          singleResponsibility: Math.round(totalSRP / moduleCount)
        },
        modules: modules.slice(0, 10) // 상위 10개만 포함
      };

    } catch (error) {
      console.error('Modularity analysis error:', error);
      return {
        score: 0,
        details: { cohesion: 0, coupling: 0, singleResponsibility: 0 },
        modules: []
      };
    }
  }

  /**
   * 4. 느슨한 결합 검증
   */
  private async analyzeLooseCoupling(): Promise<LooseCouplingScore> {
    const issues: string[] = [];
    let dependencyInversion = 100;
    let interfaceSegregation = 100;
    let circularDependencies = 100;

    try {
      // 의존성 역전 검사 (구현체가 아닌 인터페이스에 의존)
      const controllerFiles = await glob(`${this.srcPath}/controllers/**/*.ts`);
      
      for (const file of controllerFiles) {
        const content = fs.readFileSync(file, 'utf8');
        
        // 구체 클래스 import 검사
        if (content.includes('import { ') && 
           !content.includes('Port') && 
           (content.includes('Adapter') || content.includes('Service'))) {
          issues.push(`Direct dependency on concrete class in ${file}`);
          dependencyInversion -= 15;
        }
      }

      // 인터페이스 분리 검사 (큰 인터페이스 검사)
      const interfaceFiles = await glob(`${this.srcPath}/domain/ports/*.ts`);
      
      for (const file of interfaceFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const methodCount = (content.match(/\w+\(/g) || []).length;
        
        if (methodCount > 10) {
          issues.push(`Large interface detected in ${file} (${methodCount} methods)`);
          interfaceSegregation -= 20;
        }
      }

      // 순환 의존성 검사 (간단한 버전)
      const circularDeps = await this.detectCircularDependencies();
      if (circularDeps.length > 0) {
        issues.push(...circularDeps);
        circularDependencies -= circularDeps.length * 25;
      }

    } catch (error) {
      issues.push(`Loose coupling analysis error: ${error}`);
    }

    const score = Math.max(0, Math.round((dependencyInversion + interfaceSegregation + circularDependencies) / 3));
    
    return {
      score,
      details: {
        dependencyInversion: Math.max(0, dependencyInversion),
        interfaceSegregation: Math.max(0, interfaceSegregation),
        circularDependencies: Math.max(0, circularDependencies)
      },
      issues
    };
  }

  // === Helper Methods ===

  private async checkForFactoryPattern(): Promise<boolean> {
    try {
      const files = await glob(`${this.srcPath}/**/*.ts`);
      return files.some((file: string) => {
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('Factory') || content.includes('create(');
      });
    } catch {
      return false;
    }
  }

  private async checkForPluginLoader(): Promise<boolean> {
    return fs.existsSync(path.join(this.srcPath, 'plugins')) ||
           fs.existsSync(path.join(this.srcPath, 'container'));
  }

  private async analyzeModule(filePath: string): Promise<ModuleInfo> {
    const content = fs.readFileSync(filePath, 'utf8');
    const name = path.basename(filePath, '.ts');
    
    // Import 분석
    const imports = (content.match(/import .+ from .+/g) || [])
      .map(imp => imp.replace(/import .+ from ['"](.+)['"]/, '$1'));
    
    // Export 분석
    const exports = (content.match(/export .+/g) || []).length;
    
    // 책임 수 계산 (클래스, 함수, 인터페이스 수)
    const classCount = (content.match(/class \w+/g) || []).length;
    const functionCount = (content.match(/function \w+/g) || []).length;
    const interfaceCount = (content.match(/interface \w+/g) || []).length;
    const responsibilities = classCount + functionCount + interfaceCount;
    
    // 순환 복잡도 근사값 (if, for, while, catch 개수)
    const cyclomaticComplexity = 1 + 
      (content.match(/\bif\b/g) || []).length +
      (content.match(/\bfor\b/g) || []).length +
      (content.match(/\bwhile\b/g) || []).length +
      (content.match(/\bcatch\b/g) || []).length;
    
    return {
      name,
      path: filePath,
      imports,
      exports: [`${exports} exports`],
      responsibilities,
      cyclomaticComplexity
    };
  }

  private async detectCircularDependencies(): Promise<string[]> {
    // 간단한 순환 의존성 검사 (실제 구현시 더 정교한 그래프 알고리즘 필요)
    const issues: string[] = [];
    
    try {
      const files = await glob(`${this.srcPath}/**/*.ts`);
      const dependencies: Map<string, string[]> = new Map();
      
      // 의존성 맵 구성
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const imports = (content.match(/from ['"]\.\.?\/[^'"]+['"]/g) || [])
          .map((imp: string) => imp.replace(/from ['"](.+)['"]/, '$1'));
        
        dependencies.set(file, imports);
      }
      
      // 간단한 순환 검사 (A → B → A 패턴)
      for (const [fileA, importsA] of dependencies) {
        for (const importPath of importsA) {
          const fileB = this.resolveImportPath(fileA, importPath);
          const importsB = dependencies.get(fileB) || [];
          
          if (importsB.some(imp => this.resolveImportPath(fileB, imp) === fileA)) {
            issues.push(`Circular dependency: ${path.basename(fileA)} ↔ ${path.basename(fileB)}`);
          }
        }
      }
      
    } catch (error) {
      console.error('Circular dependency detection error:', error);
    }
    
    return issues;
  }

  private resolveImportPath(fromFile: string, importPath: string): string {
    if (importPath.startsWith('.')) {
      return path.resolve(path.dirname(fromFile), importPath + '.ts');
    }
    return importPath;
  }

  private generateRecommendations(analysis: ArchitectureAnalysis): string[] {
    const recs: string[] = [];
    
    if (analysis.architecture.score < 80) {
      recs.push('🏗️ Improve layer separation - ensure domain doesn\'t depend on infrastructure');
    }
    
    if (analysis.plugins.score < 70) {
      recs.push('🔌 Enhance plugin architecture - add more interface-based adapters');
    }
    
    if (analysis.modularity.score < 75) {
      recs.push('📦 Improve modularity - reduce module complexity and coupling');
    }
    
    if (analysis.looseCoupling.score < 80) {
      recs.push('🔗 Strengthen loose coupling - use dependency injection and smaller interfaces');
    }
    
    if (analysis.overallScore >= 90) {
      recs.push('✨ Excellent architecture! Consider documenting patterns for team guidance');
    }
    
    return recs;
  }

  /**
   * 분석 결과를 콘솔에 출력
   */
  printResults(analysis: ArchitectureAnalysis): void {
    console.log('\n📊 ARCHITECTURE ANALYSIS RESULTS');
    console.log('================================');
    console.log(`Overall Score: ${analysis.overallScore}/100 ${this.getScoreEmoji(analysis.overallScore)}`);
    console.log();
    
    console.log('📐 Architecture (Clean Architecture):');
    console.log(`  Score: ${analysis.architecture.score}/100`);
    console.log(`  Layer Separation: ${analysis.architecture.details.layerSeparation}/100`);
    console.log(`  Dependency Direction: ${analysis.architecture.details.dependencyDirection}/100`);
    console.log(`  Domain Purity: ${analysis.architecture.details.domainPurity}/100`);
    if (analysis.architecture.violations.length > 0) {
      console.log('  Violations:', analysis.architecture.violations.slice(0, 3));
    }
    console.log();
    
    console.log('🔌 Plugin Architecture:');
    console.log(`  Score: ${analysis.plugins.score}/100`);
    console.log(`  Interface Design: ${analysis.plugins.details.interfaceBasedDesign}/100`);
    console.log(`  Replaceability: ${analysis.plugins.details.replaceability}/100`);
    console.log(`  Extensibility: ${analysis.plugins.details.extensibility}/100`);
    console.log(`  Detected Plugins: ${analysis.plugins.plugins.length}`);
    console.log();
    
    console.log('📦 Modularity:');
    console.log(`  Score: ${analysis.modularity.score}/100`);
    console.log(`  Cohesion: ${analysis.modularity.details.cohesion}/100`);
    console.log(`  Coupling: ${analysis.modularity.details.coupling}/100`);
    console.log(`  Single Responsibility: ${analysis.modularity.details.singleResponsibility}/100`);
    console.log(`  Total Modules: ${analysis.modularity.modules.length}`);
    console.log();
    
    console.log('🔗 Loose Coupling:');
    console.log(`  Score: ${analysis.looseCoupling.score}/100`);
    console.log(`  Dependency Inversion: ${analysis.looseCoupling.details.dependencyInversion}/100`);
    console.log(`  Interface Segregation: ${analysis.looseCoupling.details.interfaceSegregation}/100`);
    console.log(`  Circular Dependencies: ${analysis.looseCoupling.details.circularDependencies}/100`);
    if (analysis.looseCoupling.issues.length > 0) {
      console.log('  Issues:', analysis.looseCoupling.issues.slice(0, 3));
    }
    console.log();
    
    console.log('💡 Recommendations:');
    analysis.recommendations.forEach(rec => console.log(`  ${rec}`));
    console.log();
  }

  private getScoreEmoji(score: number): string {
    if (score >= 90) return '🌟';
    if (score >= 80) return '✅';
    if (score >= 70) return '⚠️';
    return '❌';
  }
}

// CLI 실행 (직접 실행시)
if (require.main === module) {
  const analyzer = new ArchitectureAnalyzer();
  
  analyzer.analyze()
    .then(result => {
      analyzer.printResults(result);
      
      // 결과를 JSON 파일로 저장
      fs.writeFileSync(
        'architecture-analysis.json',
        JSON.stringify(result, null, 2)
      );
      
      console.log('📄 Results saved to architecture-analysis.json');
      
      // 점수가 낮으면 에러 코드로 종료 (CI에서 활용)
      process.exit(result.overallScore < 70 ? 1 : 0);
    })
    .catch(error => {
      console.error('Analysis failed:', error);
      process.exit(1);
    });
}