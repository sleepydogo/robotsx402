// Configuration
// Use same origin in production, localhost in development
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8002'
    : window.location.origin;
const MINT_ADDRESS = '8r2xLuDRsf6sVrdgTKoBM2gmWoixfXb5fzLyDqdEHtMX';
const RPC_URL = 'https://api.devnet.solana.com';

// Global state
let walletProvider = null;
let walletPublicKey = null;
let connection = null;

// DOM elements
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const airdropBtn = document.getElementById('airdropBtn');
const refreshBtn = document.getElementById('refreshBtn');
const walletSection = document.getElementById('walletSection');
const connectedSection = document.getElementById('connectedSection');
const walletAddressEl = document.getElementById('walletAddress');
const balanceEl = document.getElementById('balance');
const statusMessageEl = document.getElementById('statusMessage');

// Initialize
async function init() {
    // Setup Solana connection
    connection = new solanaWeb3.Connection(RPC_URL, 'confirmed');

    // Check if wallet is already connected
    await checkWalletConnection();

    // Event listeners
    connectBtn.addEventListener('click', connectWallet);
    disconnectBtn.addEventListener('click', disconnectWallet);
    airdropBtn.addEventListener('click', requestAirdrop);
    refreshBtn.addEventListener('click', updateBalance);

    // Listen for wallet changes
    if (window.solana) {
        window.solana.on('accountChanged', handleAccountChanged);
        window.solana.on('disconnect', handleDisconnect);
    }
}

// Check if wallet is already connected
async function checkWalletConnection() {
    if (window.solana && window.solana.isConnected) {
        walletProvider = window.solana;
        walletPublicKey = walletProvider.publicKey;
        await onWalletConnected();
    }
}

// Connect wallet
async function connectWallet() {
    try {
        if (!window.solana) {
            showStatus(
                'error',
                'No Solana wallet was found. Please install Phantom or another compatible wallet.'
            );
            return;
        }

        showStatus('loading', 'Connecting wallet...');

        const response = await window.solana.connect();
        walletProvider = window.solana;
        walletPublicKey = response.publicKey;

        await onWalletConnected();

        hideStatus();
    } catch (error) {
        console.error('Error connecting wallet:', error);
        showStatus('error', 'Error connecting wallet: ' + error.message);
    }
}

// Disconnect wallet
async function disconnectWallet() {
    try {
        if (walletProvider) {
            await walletProvider.disconnect();
        }
        handleDisconnect();
    } catch (error) {
        console.error('Error disconnecting wallet:', error);
    }
}

// Handle wallet connected
async function onWalletConnected() {
    // Update UI
    walletSection.classList.add('hidden');
    connectedSection.classList.remove('hidden');

    // Display wallet address
    const address = walletPublicKey.toString();
    walletAddressEl.textContent = `${address.slice(0, 4)}...${address.slice(-4)}`;
    walletAddressEl.title = address;

    // Update balance
    await updateBalance();
}

// Handle account changed
async function handleAccountChanged(publicKey) {
    if (publicKey) {
        walletPublicKey = publicKey;
        await onWalletConnected();
    } else {
        handleDisconnect();
    }
}

// Handle disconnect
function handleDisconnect() {
    walletProvider = null;
    walletPublicKey = null;

    // Update UI
    walletSection.classList.remove('hidden');
    connectedSection.classList.add('hidden');
    balanceEl.textContent = '0.00 rUSD';
    hideStatus();
}

// Update balance
async function updateBalance() {
    if (!walletPublicKey) return;

    try {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<span class="spinner"></span>Updating...';

        const mintPublicKey = new solanaWeb3.PublicKey(MINT_ADDRESS);

        // Calculate associated token account address
        const TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey(
            'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        );
        const ASSOCIATED_TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey(
            'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
        );

        const [tokenAccount] = solanaWeb3.PublicKey.findProgramAddressSync(
            [
                walletPublicKey.toBuffer(),
                TOKEN_PROGRAM_ID.toBuffer(),
                mintPublicKey.toBuffer(),
            ],
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Get account info
        try {
            const accountInfo = await connection.getAccountInfo(tokenAccount);
            if (accountInfo) {
                const data = accountInfo.data;
                const amount = data.readBigUInt64LE(64);
                const balance = Number(amount) / 1_000_000;
                balanceEl.textContent = `${balance.toFixed(2)} rUSD`;
            } else {
                balanceEl.textContent = '0.00 rUSD';
            }
        } catch (error) {
            console.log('Account not found or error:', error.message);
            balanceEl.textContent = '0.00 rUSD';
        }
    } catch (error) {
        console.error('Error updating balance:', error);
        balanceEl.textContent = 'Error';
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '🔄 Refresh';
    }
}

// Request airdrop
async function requestAirdrop() {
    if (!walletPublicKey) {
        showStatus('error', 'Please connect your wallet first.');
        return;
    }

    try {
        airdropBtn.disabled = true;
        airdropBtn.innerHTML = '<span class="spinner"></span>Processing...';

        showStatus('loading', 'Requesting a 50 rUSD airdrop...');

        const response = await fetch(`${BACKEND_URL}/airdrop`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                wallet_address: walletPublicKey.toString(),
                amount: 50,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Error processing the airdrop');
        }

        showStatus(
            'success',
            `Airdrop successful! You received 50 rUSD.<br>` +
            `<a href="https://explorer.solana.com/tx/${data.signature}?cluster=devnet" target="_blank" style="color: #059669; text-decoration: underline;">View transaction on Solana Explorer</a>`
        );

        setTimeout(updateBalance, 2000);
    } catch (error) {
        console.error('Error requesting airdrop:', error);
        showStatus(
            'error',
            error.message || 'Error requesting the airdrop. Please try again.'
        );
    } finally {
        airdropBtn.disabled = false;
        airdropBtn.innerHTML = '🎁 Request 50 rUSD';
    }
}

// Show status message
function showStatus(type, message) {
    statusMessageEl.className = `status ${type}`;
    statusMessageEl.innerHTML = message;
    statusMessageEl.classList.remove('hidden');
}

// Hide status message
function hideStatus() {
    statusMessageEl.classList.add('hidden');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
