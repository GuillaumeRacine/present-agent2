#!/usr/bin/env tsx
/**
 * Development startup script
 * Starts backend server, waits for it to be ready, then starts frontend
 */

import { spawn } from 'child_process';
import http from 'http';

const BACKEND_PORT = process.env.BACKEND_PORT || 3000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const MAX_RETRIES = 30;
const RETRY_DELAY = 1000; // 1 second

console.log('🚀 Starting Present-Agent2 development environment...\n');

// Start backend server
console.log('📦 Starting backend server...');
const backend = spawn('npm', ['run', 'server:dev'], {
  stdio: 'inherit',
  shell: true,
});

backend.on('error', (error) => {
  console.error('❌ Failed to start backend:', error);
  process.exit(1);
});

// Wait for backend to be ready
async function waitForBackend(): Promise<boolean> {
  console.log(`⏳ Waiting for backend to be ready at ${BACKEND_URL}/health...`);

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(`${BACKEND_URL}/health`, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Health check returned ${res.statusCode}`));
          }
        });

        req.on('error', reject);
        req.setTimeout(2000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });

      console.log('✅ Backend is ready!\n');
      return true;
    } catch (error) {
      // Retry
      process.stdout.write('.');
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }

  return false;
}

// Start frontend
function startFrontend() {
  console.log('🎨 Starting frontend...');
  const frontend = spawn('npm', ['run', 'frontend'], {
    stdio: 'inherit',
    shell: true,
  });

  frontend.on('error', (error) => {
    console.error('❌ Failed to start frontend:', error);
    killAll();
  });

  return frontend;
}

// Graceful shutdown
let frontendProcess: ReturnType<typeof spawn> | null = null;

function killAll() {
  console.log('\n\n🛑 Shutting down...');

  if (frontendProcess) {
    frontendProcess.kill('SIGTERM');
  }

  backend.kill('SIGTERM');

  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

process.on('SIGINT', killAll);
process.on('SIGTERM', killAll);

// Main execution
(async () => {
  const backendReady = await waitForBackend();

  if (!backendReady) {
    console.error('❌ Backend failed to start after 30 seconds');
    backend.kill('SIGTERM');
    process.exit(1);
  }

  frontendProcess = startFrontend();

  console.log('\n✨ Development environment is ready!');
  console.log('━'.repeat(50));
  console.log('📍 Backend:  http://localhost:3000');
  console.log('📍 Frontend: http://localhost:3001');
  console.log('━'.repeat(50));
  console.log('\n💡 Press Ctrl+C to stop both servers\n');
})();
