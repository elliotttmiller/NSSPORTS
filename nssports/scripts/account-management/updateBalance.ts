import prisma from '../../src/lib/prisma';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function getAllUsers() {
  const users = await prisma.user.findMany({
    include: {
      account: true
    },
    orderBy: {
      username: 'asc'
    }
  });
  return users;
}

async function displayUsers() {
  console.log('\n📋 REGISTERED USER ACCOUNTS\n');
  console.log('════════════════════════════════════════════════════════════');
  
  const users = await getAllUsers();
  
  if (users.length === 0) {
    console.log('No users found in database.');
    return [];
  }
  
  users.forEach((user, index) => {
    const balance = user.account?.balance || 0;
    console.log(`${index + 1}. ${user.username.padEnd(20)} | Balance: $${balance.toFixed(2).padStart(10)} | ID: ${user.id}`);
  });
  
  console.log('════════════════════════════════════════════════════════════\n');
  return users;
}

async function updateBalance(userId: string, newBalance: number) {
  const account = await prisma.account.findUnique({ where: { userId } });
  const currentBalance = account?.balance || 0;
  
  await prisma.account.update({
    where: { userId },
    data: { balance: newBalance }
  });
  
  return { currentBalance, newBalance };
}

async function main() {
  console.log('\n💰 ACCOUNT BALANCE MANAGEMENT TOOL\n');
  
  // Display all users
  const users = await displayUsers();
  
  if (users.length === 0) {
    rl.close();
    return;
  }
  
  // Get user selection
  const selectionInput = await question('Enter the number of the account to update (or username): ');
  
  let selectedUser;
  
  // Check if input is a number (index selection)
  const selectionNum = parseInt(selectionInput);
  if (!isNaN(selectionNum) && selectionNum > 0 && selectionNum <= users.length) {
    selectedUser = users[selectionNum - 1];
  } else {
    // Search by username
    selectedUser = users.find(u => u.username.toLowerCase() === selectionInput.toLowerCase());
  }
  
  if (!selectedUser) {
    console.log('\n❌ Invalid selection. User not found.');
    rl.close();
    return;
  }
  
  const currentBalance = selectedUser.account?.balance || 0;
  console.log(`\n✅ Selected: ${selectedUser.username}`);
  console.log(`   Current Balance: $${currentBalance.toFixed(2)}`);
  
  // Get new balance
  const newBalanceInput = await question('\nEnter the new balance amount (e.g., 1000.00): $');
  const newBalance = parseFloat(newBalanceInput);
  
  if (isNaN(newBalance) || newBalance < 0) {
    console.log('\n❌ Invalid amount. Balance must be a positive number.');
    rl.close();
    return;
  }
  
  // Confirm update
  console.log('\n⚠️  CONFIRM BALANCE UPDATE');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`Account: ${selectedUser.username}`);
  console.log(`Current Balance: $${currentBalance.toFixed(2)}`);
  console.log(`New Balance: $${newBalance.toFixed(2)}`);
  console.log(`Change: ${newBalance >= currentBalance ? '+' : ''}$${(newBalance - currentBalance).toFixed(2)}`);
  console.log('════════════════════════════════════════════════════════════');
  
  const confirmation = await question('\nProceed with balance update? (yes/no): ');
  
  if (confirmation.toLowerCase() !== 'yes' && confirmation.toLowerCase() !== 'y') {
    console.log('\n❌ Balance update cancelled.');
    rl.close();
    return;
  }
  
  // Perform update
  const result = await updateBalance(selectedUser.id, newBalance);
  
  console.log('\n✅ BALANCE UPDATED SUCCESSFULLY');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`Account: ${selectedUser.username}`);
  console.log(`Previous Balance: $${result.currentBalance.toFixed(2)}`);
  console.log(`New Balance: $${result.newBalance.toFixed(2)}`);
  console.log(`Difference: ${result.newBalance >= result.currentBalance ? '+' : ''}$${(result.newBalance - result.currentBalance).toFixed(2)}`);
  console.log('════════════════════════════════════════════════════════════\n');
  
  rl.close();
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error);
    rl.close();
  })
  .finally(() => prisma.$disconnect());
