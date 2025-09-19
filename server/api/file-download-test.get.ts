import formidable from 'formidable'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { defineEventHandler, sendStream } from 'h3'
import logger from '../utils/logger'

export const config = {
  api: {
    bodyParser: false
  }
}

export default defineEventHandler(async (event) => {
  logger.info('file-download-test', 'Running file download test')
  
  try {
    // Create a test file with some dummy content
    const testDir = path.join(tmpdir(), `download-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
    
    // Create test files
    const textFile = path.join(testDir, 'test.txt');
    await fs.writeFile(textFile, 'This is a test download file.');
    
    const cmdFile = path.join(testDir, 'test.cmd');
    await fs.writeFile(cmdFile, '@echo off\necho This is a test CMD file\necho %date% %time%\nexit /b 0');
    
    // Determine which file to send based on query param
    const query = new URL(event.node.req.url || '', 'http://localhost').searchParams;
    const fileType = query.get('type') || 'txt';
    
    let filePath = textFile;
    let fileName = 'test.txt';
    let contentType = 'text/plain';
    
    if (fileType === 'cmd') {
      filePath = cmdFile;
      fileName = 'test.cmd';
      contentType = 'application/octet-stream';
    }
    
    // Log the file we're about to send
    const fileStats = await fs.stat(filePath);
    logger.info('file-download-test', `Sending file ${filePath}, size: ${fileStats.size} bytes`);
    
    // Set appropriate headers
    event.node.res.setHeader('Content-Type', contentType);
    event.node.res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    event.node.res.setHeader('Content-Length', fileStats.size);
    
    // Log all headers for debugging
    logger.info('file-download-test', 'Response headers:');
    Object.entries(event.node.res.getHeaders()).forEach(([key, value]) => {
      logger.info('file-download-test', `${key}: ${value}`);
    });
    
    // Send the file as a stream
    const fileStream = createReadStream(filePath);
    return sendStream(event, fileStream);
    
  } catch (err) {
    logger.error('file-download-test', `Error in file download test: ${err}`);
    return {
      error: `Test failed: ${err}`
    };
  }
});