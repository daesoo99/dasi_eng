const BaseService = require('./baseService');
const { v4: uuidv4 } = require('uuid');

class InterviewService extends BaseService {
  constructor() {
    super('InterviewService');
    
    // 메모리 저장소 (나중에 Firebase로 교체)
    this.sessions = new Map();
    this.questions = new Map();
    this.evaluations = new Map();
    
    // 기본 면접 질문 템플릿
    this.questionTemplates = {
      '프론트엔드': [
        '자기소개를 해주세요.',
        'React와 Vue.js의 차이점과 각각의 장단점에 대해 설명해주세요.',
        '본인이 개발한 프로젝트 중 가장 기억에 남는 것을 소개해주세요.',
        '웹 성능 최적화를 위해 어떤 방법들을 사용해보셨나요?',
        '마지막으로 질문이 있으시면 해주세요.'
      ],
      '백엔드': [
        '자기소개를 해주세요.',
        'RESTful API 설계 원칙에 대해 설명해주세요.',
        '데이터베이스 최적화 경험이 있다면 공유해주세요.',
        '대용량 트래픽 처리를 위한 방법들을 설명해주세요.',
        '마지막으로 질문이 있으시면 해주세요.'
      ],
      '풀스택': [
        '자기소개를 해주세요.',
        '프론트엔드와 백엔드 중 어느 쪽에 더 관심이 있으신가요?',
        '본인만의 개발 철학이 있다면 공유해주세요.',
        '새로운 기술을 학습하는 본인만의 방법이 있나요?',
        '마지막으로 질문이 있으시면 해주세요.'
      ],
      'default': [
        '자기소개를 해주세요.',
        '이 직무에 지원하게 된 동기를 말씀해주세요.',
        '본인의 강점과 약점을 설명해주세요.',
        '어려운 상황을 극복한 경험이 있다면 공유해주세요.',
        '마지막으로 질문이 있으시면 해주세요.'
      ]
    };
  }

  // 새로운 면접 세션 시작
  async startInterview(config) {
    try {
      this.log('새로운 면접 세션 시작');
      
      // 필수 필드 검증
      this.validateRequired(config, ['position', 'experience']);
      
      // 데이터 정리
      const sanitizedConfig = this.sanitizeObject(config);
      
      const sessionId = uuidv4();
      const sessionData = {
        id: sessionId,
        config: {
          ...sanitizedConfig,
          duration: sanitizedConfig.duration || 30 // 기본 30분
        },
        questions: [],
        answers: [],
        evaluations: [],
        startTime: Date.now(),
        status: 'active',
        currentQuestionIndex: 0
      };

      // 첫 번째 질문 생성
      const firstQuestion = this.generateQuestion(sanitizedConfig.position, 0);
      sessionData.questions.push(firstQuestion);

      // 세션 저장
      this.sessions.set(sessionId, sessionData);
      
      this.log(`면접 세션 생성 완료: ${sessionId}`);
      
      return this.successResponse({
        interviewId: sessionId,
        question: firstQuestion.text,
        questionCount: 1,
        totalQuestions: 5,
        sessionInfo: {
          position: sanitizedConfig.position,
          experience: sanitizedConfig.experience
        }
      }, '면접이 시작되었습니다.');

    } catch (error) {
      this.logError(error, '면접 시작 중 오류');
      throw error;
    }
  }

  // 다음 질문 생성
  async getNextQuestion(interviewId, position) {
    try {
      this.log(`다음 질문 요청: ${interviewId}`);
      
      const session = this.sessions.get(interviewId);
      if (!session) {
        throw new Error('면접 세션을 찾을 수 없습니다.');
      }

      const nextIndex = session.questions.length;
      const maxQuestions = 5;

      if (nextIndex >= maxQuestions) {
        this.log(`면접 완료 - 최대 질문 수 도달: ${nextIndex}`);
        return this.successResponse({
          question: null,
          isComplete: true,
          message: '면접이 완료되었습니다.'
        }, '모든 질문이 완료되었습니다.');
      }

      // 다음 질문 생성
      const nextQuestion = this.generateQuestion(position, nextIndex);
      session.questions.push(nextQuestion);
      session.currentQuestionIndex = nextIndex;
      
      // 세션 업데이트
      this.sessions.set(interviewId, session);
      
      this.log(`질문 ${nextIndex + 1} 생성 완료`);
      
      return this.successResponse({
        question: nextQuestion.text,
        questionCount: nextIndex + 1,
        totalQuestions: maxQuestions
      }, '다음 질문이 생성되었습니다.');

    } catch (error) {
      this.logError(error, '질문 생성 중 오류');
      throw error;
    }
  }

  // 답변 평가
  async evaluateAnswer(data) {
    try {
      this.log('답변 평가 시작');
      
      // 필수 필드 검증
      this.validateRequired(data, ['question', 'answer']);
      
      // 데이터 정리
      const { question, answer, position, interviewId } = this.sanitizeObject(data);
      
      // 기본 평가 로직 (AI 연동 전 임시)
      const evaluation = this.basicEvaluation(answer, position);
      
      // 세션에 답변 저장
      if (interviewId) {
        const session = this.sessions.get(interviewId);
        if (session) {
          const questionId = session.questions[session.questions.length - 1]?.id;
          session.answers.push({
            questionId,
            text: answer,
            timestamp: Date.now()
          });
          this.sessions.set(interviewId, session);
        }
      }

      // 평가 결과 저장
      const evaluationId = uuidv4();
      this.evaluations.set(evaluationId, {
        id: evaluationId,
        interviewId,
        question,
        answer,
        ...evaluation,
        timestamp: Date.now()
      });
      
      this.log('답변 평가 완료');
      
      return this.successResponse(evaluation, '답변이 평가되었습니다.');

    } catch (error) {
      this.logError(error, '답변 평가 중 오류');
      throw error;
    }
  }

  // 면접 종료
  async endInterview(interviewId) {
    try {
      this.log(`면접 종료 요청: ${interviewId}`);
      
      const session = this.sessions.get(interviewId);
      if (!session) {
        throw new Error('면접 세션을 찾을 수 없습니다.');
      }

      // 세션 상태 업데이트
      session.status = 'completed';
      session.endTime = Date.now();
      
      const duration = Math.floor((session.endTime - session.startTime) / 1000 / 60); // 분 단위
      const completionRate = Math.round((session.answers.length / session.questions.length) * 100);
      
      this.sessions.set(interviewId, session);
      
      this.log(`면접 종료 완료: ${interviewId}, 소요시간: ${duration}분`);
      
      return this.successResponse({
        message: '면접이 완료되었습니다.',
        duration: `${duration}분`,
        totalQuestions: session.questions.length,
        totalAnswers: session.answers.length,
        completionRate: `${completionRate}%`,
        summary: {
          position: session.config.position,
          experience: session.config.experience,
          startTime: new Date(session.startTime).toLocaleString('ko-KR'),
          endTime: new Date(session.endTime).toLocaleString('ko-KR')
        }
      }, '면접이 성공적으로 완료되었습니다.');

    } catch (error) {
      this.logError(error, '면접 종료 중 오류');
      throw error;
    }
  }

  // 세션 조회
  async getSession(interviewId) {
    try {
      const session = this.sessions.get(interviewId);
      if (!session) {
        throw new Error('면접 세션을 찾을 수 없습니다.');
      }

      return this.successResponse(session, '세션 정보를 가져왔습니다.');

    } catch (error) {
      this.logError(error, '세션 조회 중 오류');
      throw error;
    }
  }

  // 질문 생성 (기본 로직)
  generateQuestion(position, questionIndex) {
    const templates = this.questionTemplates[position] || this.questionTemplates['default'];
    const questionText = templates[questionIndex] || templates[templates.length - 1];
    
    return {
      id: uuidv4(),
      text: questionText,
      timestamp: Date.now(),
      index: questionIndex
    };
  }

  // 기본 평가 로직 (AI 연동 전 임시)
  basicEvaluation(answer, position) {
    const wordCount = answer.split(' ').length;
    const charCount = answer.length;
    
    // 기본 점수 계산
    let baseScore = 70;
    
    // 답변 길이에 따른 점수 조정
    if (wordCount > 50) baseScore += 15;
    else if (wordCount > 30) baseScore += 10;
    else if (wordCount > 15) baseScore += 5;
    else if (wordCount < 5) baseScore -= 20;

    // 직무별 키워드 보너스
    const keywords = this.getPositionKeywords(position);
    let keywordBonus = 0;
    
    keywords.forEach(keyword => {
      if (answer.toLowerCase().includes(keyword.toLowerCase())) {
        keywordBonus += 2;
      }
    });

    const finalScore = Math.min(100, Math.max(40, baseScore + keywordBonus));
    
    return {
      score: finalScore,
      feedback: this.generateFeedback(wordCount, charCount, finalScore, position),
      strengths: this.generateStrengths(wordCount, finalScore),
      improvements: this.generateImprovements(wordCount, finalScore),
      analysis: {
        wordCount,
        charCount,
        keywordMatches: keywordBonus / 2,
        estimatedSpeakingTime: Math.ceil(wordCount / 150) // 분당 150단어 기준
      }
    };
  }

  // 직무별 키워드
  getPositionKeywords(position) {
    const keywordMap = {
      '프론트엔드': ['React', 'Vue', 'JavaScript', 'HTML', 'CSS', 'UI', 'UX', '반응형', '최적화'],
      '백엔드': ['API', 'Database', 'Server', 'Node.js', 'Python', 'Java', '데이터베이스', '서버', '성능'],
      '풀스택': ['프론트엔드', '백엔드', 'Full Stack', '전체', '통합', '개발']
    };
    
    return keywordMap[position] || ['개발', '프로그래밍', '기술', '경험', '프로젝트'];
  }

  // 피드백 생성
  generateFeedback(wordCount, charCount, score, position) {
    let feedback = '';
    
    if (score >= 90) {
      feedback = '훌륭한 답변입니다! 구체적이고 체계적으로 잘 설명해주셨습니다.';
    } else if (score >= 80) {
      feedback = '좋은 답변입니다. 경험과 지식이 잘 드러나는 내용이었습니다.';
    } else if (score >= 70) {
      feedback = '적절한 답변입니다. 조금 더 구체적인 예시가 있으면 더 좋겠습니다.';
    } else if (score >= 60) {
      feedback = '기본적인 답변입니다. 더 상세한 설명과 경험을 추가해보세요.';
    } else {
      feedback = '답변을 보완해주세요. 더 구체적이고 상세한 설명이 필요합니다.';
    }

    if (wordCount < 10) {
      feedback += ' 답변이 너무 짧습니다. 더 자세히 설명해주세요.';
    } else if (wordCount > 100) {
      feedback += ' 답변이 길어서 요점을 간결하게 정리하면 더 좋겠습니다.';
    }

    return feedback;
  }

  // 강점 생성
  generateStrengths(wordCount, score) {
    const strengths = [];
    
    if (wordCount > 20) strengths.push('충분한 설명');
    if (score >= 80) strengths.push('명확한 답변');
    if (wordCount >= 15 && wordCount <= 60) strengths.push('적절한 답변 길이');
    
    return strengths.length > 0 ? strengths : ['질문 이해'];
  }

  // 개선점 생성
  generateImprovements(wordCount, score) {
    const improvements = [];
    
    if (wordCount < 15) improvements.push('더 상세한 설명');
    if (wordCount > 80) improvements.push('핵심 내용 요약');
    if (score < 70) improvements.push('구체적인 예시 추가');
    improvements.push('자신감 있는 어조');
    
    return improvements;
  }

  // 통계 조회
  async getStatistics() {
    try {
      const totalSessions = this.sessions.size;
      const activeSessions = Array.from(this.sessions.values()).filter(s => s.status === 'active').length;
      const completedSessions = Array.from(this.sessions.values()).filter(s => s.status === 'completed').length;
      const totalEvaluations = this.evaluations.size;

      return this.successResponse({
        totalSessions,
        activeSessions,
        completedSessions,
        totalEvaluations,
        averageSessionTime: this.calculateAverageSessionTime()
      }, '통계 정보를 가져왔습니다.');

    } catch (error) {
      this.logError(error, '통계 조회 중 오류');
      throw error;
    }
  }

  // 평균 세션 시간 계산
  calculateAverageSessionTime() {
    const completedSessions = Array.from(this.sessions.values())
      .filter(s => s.status === 'completed' && s.endTime);
    
    if (completedSessions.length === 0) return 0;
    
    const totalTime = completedSessions.reduce((sum, session) => {
      return sum + (session.endTime - session.startTime);
    }, 0);
    
    return Math.floor(totalTime / completedSessions.length / 1000 / 60); // 분 단위
  }
}

module.exports = new InterviewService();