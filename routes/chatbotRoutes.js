const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const path = require('path');

// Cấu hình Dialogflow
const DIALOGFLOW_CONFIG = {
  projectId: 'voting-9xfa',
  languageCode: 'vi',
  // Đường dẫn đến file service account
  keyFilePath: path.join(__dirname, '../config/voting-9xfa-e1376c036a69.json')
};

// Khởi tạo Dialogflow client
let dialogflowClient = null;

const initializeDialogflow = async () => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: DIALOGFLOW_CONFIG.keyFilePath,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const authClient = await auth.getClient();
    dialogflowClient = google.dialogflow({
      version: 'v2',
      auth: authClient
    });
    
    console.log('Dialogflow client initialized successfully');
  } catch (error) {
    console.error('Error initializing Dialogflow client:', error);
  }
};

// Khởi tạo client khi server start
initializeDialogflow();

// API endpoint để gửi tin nhắn đến Dialogflow
router.post('/send-message', async (req, res) => {
  try {
    const { message, sessionId = 'default-session' } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    if (!dialogflowClient) {
      return res.status(500).json({
        success: false,
        error: 'Dialogflow client not initialized'
      });
    }

    // Tạo request cho Dialogflow với cấu trúc đúng theo Dialogflow v2 API
    const request = {
      session: `projects/${DIALOGFLOW_CONFIG.projectId}/agent/sessions/${sessionId}`,
      queryInput: {
        text: {
          text: message.trim(),
          languageCode: DIALOGFLOW_CONFIG.languageCode
        }
      }
    };

    console.log('Sending request to Dialogflow:', JSON.stringify(request, null, 2));

    // Gọi Dialogflow API với cấu trúc request đúng
    const response = await dialogflowClient.projects.agent.sessions.detectIntent({
      session: request.session,
      requestBody: {
        queryInput: request.queryInput
      }
    });

    const result = response.data.queryResult;
    
    console.log('Dialogflow response:', JSON.stringify(result, null, 2));
    
    // Trả về kết quả
    res.json({
      success: true,
      data: {
        fulfillmentText: result.fulfillmentText || 'Xin lỗi, tôi không hiểu câu hỏi của bạn.',
        intent: result.intent?.displayName || 'unknown',
        confidence: result.intentDetectionConfidence || 0,
        action: result.action || '',
        parameters: result.parameters || {},
        allRequiredParamsPresent: result.allRequiredParamsPresent || false
      }
    });

  } catch (error) {
    console.error('Error calling Dialogflow:', error);
    console.error('Error details:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// API endpoint để lấy thông tin về các intent có sẵn
router.get('/intents', async (req, res) => {
  try {
    if (!dialogflowClient) {
      return res.status(500).json({
        success: false,
        error: 'Dialogflow client not initialized'
      });
    }

    const request = {
      parent: `projects/${DIALOGFLOW_CONFIG.projectId}/agent`
    };

    const response = await dialogflowClient.projects.agent.intents.list(request);
    
    const intents = response.data.intents || [];
    
    res.json({
      success: true,
      data: {
        intents: intents.map(intent => ({
          name: intent.displayName,
          description: intent.description || '',
          trainingPhrases: intent.trainingPhrases || [],
          responses: intent.messages || []
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching intents:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// API endpoint để lấy thống kê chatbot
router.get('/stats', async (req, res) => {
  try {
    // Có thể thêm logic để lưu và trả về thống kê sử dụng chatbot
    res.json({
      success: true,
      data: {
        totalMessages: 0, // Sẽ được cập nhật khi có database
        activeUsers: 0,
        popularIntents: [],
        responseTime: 'average'
      }
    });
  } catch (error) {
    console.error('Error getting chatbot stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router; 