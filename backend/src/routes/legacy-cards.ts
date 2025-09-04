/**
 * Legacy Cards API - 인증 없는 개발용 라우트
 * @description 기존 프론트엔드와 호환을 위한 임시 라우트
 */

import { Router } from 'express';
import { ServiceRegistry } from '../container/ServiceRegistry';
import { ContentPort } from '../domain/ports/ContentPort';

export function createLegacyCardsRouter(serviceRegistry: ServiceRegistry): Router {
  const router = Router();

  // GET /cards?level=4&stage=1 라우트
  router.get('/cards', async (req, res) => {
    try {
      const { level, stage } = req.query;
      
      if (!level || !stage) {
        return res.status(400).json({
          success: false,
          error: 'level and stage parameters are required'
        });
      }

      const levelNum = parseInt(level as string);
      const stageNum = parseInt(stage as string);

      if (isNaN(levelNum) || isNaN(stageNum)) {
        return res.status(400).json({
          success: false,
          error: 'level and stage must be numbers'
        });
      }

      // ContentPort를 통해 데이터 가져오기
      const contentPort = await serviceRegistry.get<ContentPort>('content');
      const cards = await contentPort.getStageCards(levelNum, stageNum);

      console.log(`📋 Legacy API: Level ${levelNum} Stage ${stageNum} - ${cards.length} cards`);

      res.json({
        success: true,
        data: {
          data: {
            cards: cards
          }
        }
      });
    } catch (error) {
      console.error('Legacy cards API error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  return router;
}