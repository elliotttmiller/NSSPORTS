import { settlementQueue } from '../../src/lib/queues/settlement.js';
import { redis } from '../../src/lib/redis.js';

async function checkWorkerStatus() {
  try {
    console.log('\n📊 Redis Queue Status\n');
    console.log('='.repeat(60));
    
    // Get job counts
    const counts = await settlementQueue.getJobCounts();
    console.log('\n📋 Job Counts:');
    console.log(`   Active: ${counts.active}`);
    console.log(`   Waiting: ${counts.waiting}`);
    console.log(`   Completed: ${counts.completed}`);
    console.log(`   Failed: ${counts.failed}`);
    console.log(`   Delayed: ${counts.delayed}`);
    
    // Get recent jobs
    const completed = await settlementQueue.getJobs(['completed'], 0, 5);
    const failed = await settlementQueue.getJobs(['failed'], 0, 5);
    const active = await settlementQueue.getJobs(['active'], 0, 5);
    const delayed = await settlementQueue.getJobs(['delayed'], 0, 5);
    
    if (active.length > 0) {
      console.log('\n🔄 Active Jobs:');
      for (const job of active) {
        console.log(`   Job ${job.id}: ${job.name}`);
        console.log(`   Progress: ${job.progress}%`);
        console.log(`   Timestamp: ${new Date(job.timestamp).toLocaleString()}`);
      }
    }
    
    if (delayed.length > 0) {
      console.log('\n⏰ Delayed Jobs:');
      for (const job of delayed) {
        console.log(`   Job ${job.id}: ${job.name}`);
        console.log(`   Data: ${JSON.stringify(job.data, null, 2)}`);
        console.log(`   Scheduled for: ${job.opts.delay ? new Date(job.timestamp + job.opts.delay).toLocaleString() : 'N/A'}`);
      }
    }
    
    if (completed.length > 0) {
      console.log('\n✅ Recent Completed Jobs:');
      for (const job of completed) {
        console.log(`   Job ${job.id}: ${job.name}`);
        console.log(`   Finished: ${job.finishedOn ? new Date(job.finishedOn).toLocaleString() : 'N/A'}`);
        if (job.returnvalue) {
          console.log(`   Result: ${JSON.stringify(job.returnvalue, null, 2)}`);
        }
      }
    }
    
    if (failed.length > 0) {
      console.log('\n❌ Recent Failed Jobs:');
      for (const job of failed) {
        console.log(`   Job ${job.id}: ${job.name}`);
        console.log(`   Failed: ${job.failedReason}`);
        console.log(`   Error: ${job.stacktrace?.[0] || 'No stacktrace'}`);
      }
    }
    
    // Check Redis connection
    console.log('\n🔌 Redis Connection:');
    const pingResult = await redis.ping();
    console.log(`   Status: ${pingResult === 'PONG' ? '✅ Connected' : '❌ Disconnected'}`);
    
    console.log('\n' + '='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Error checking worker status:', error);
  } finally {
    await settlementQueue.close();
    await redis.quit();
    process.exit(0);
  }
}

checkWorkerStatus();
