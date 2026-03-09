/**
 * Trigger LMS sync for a student
 */

const STUDENT_ID = 'ee5baa83-99a7-49ad-ac11-a407d3f5f7a7';

async function main() {
  console.log(`Triggering sync for student: ${STUDENT_ID}\n`);

  try {
    const response = await fetch('https://forgestudyai.vercel.app/api/internal/sync/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId: STUDENT_ID,
        triggerType: 'manual',
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Sync triggered successfully!\n');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error('❌ Sync failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
