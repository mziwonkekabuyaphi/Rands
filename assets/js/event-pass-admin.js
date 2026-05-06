// event-pass-admin.js
// Cleaned Event Pass Admin Dashboard

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ========== SUPABASE ==========
const SUPABASE_URL = 'https://fqbcidcezfprranfxhyj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxYmNpZGNlemZwcnJhbmZ4aHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MjY0ODgsImV4cCI6MjA5MzIwMjQ4OH0.eGCEE-lA8yLGjU1nFXv_A1RjbWvRbb5Mfm8FMzVRgHI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== STATE ==========
let accounts = [];
let transactionsMap = {};
let events = [];
let refundRequests = [];
let staffActivity = [];

let selectedAccountId = null;
let selectedEventId = null;

// Admin profile
const ADMIN = {
    phone: "0635713652",
    name: "Mziwonke KaBuyaphi",
    balance: 12580.50
};

// ========== UI HELPERS ==========
function showToast(message, type = "success") {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const msg = document.getElementById('toastMessage');

    icon.innerText =
        type === 'success' ? '✅' :
        type === 'error' ? '❌' : '⚠️';

    msg.innerText = message;

    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function escapeHtml(text = '') {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== SUPABASE EVENTS ==========
async function loadEventsFromSupabase() {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        showToast('Failed to load events', 'error');
        return [];
    }

    return (data || []).map(e => ({
        id: e.id,
        name: e.name,
        date: e.start_time?.split('T')[0] || '',
        location: e.location || 'Rands',
        status: 'active',
        ticketTypes: parseTicketTypes(e.description)
    }));
}

function parseTicketTypes(desc = '') {
    return {
        earlyBird: { price: 250, capacity: 200, sold: 0 },
        general: { price: 350, capacity: 400, sold: 0 },
        vip: { price: 550, capacity: 80, sold: 0 }
    };
}

// ========== STORAGE (SIMPLIFIED) ==========
function loadAllData() {
    const stored = localStorage.getItem('rands_accounts_v2');
    accounts = stored ? JSON.parse(stored) : [];

    if (!accounts.find(a => a.id === ADMIN.phone)) {
        accounts.push({
            id: ADMIN.phone,
            name: ADMIN.name,
            balance: ADMIN.balance,
            status: "Active"
        });
    }

    const tx = localStorage.getItem('rands_transactions');
    transactionsMap = tx ? JSON.parse(tx) : {};
}

function saveAccounts() {
    localStorage.setItem('rands_accounts_v2', JSON.stringify(accounts));
}

function saveTransactions() {
    localStorage.setItem('rands_transactions', JSON.stringify(transactionsMap));
}

// ========== TRANSACTIONS ==========
function addTransaction(accountId, desc, amount) {
    if (!transactionsMap[accountId]) transactionsMap[accountId] = [];

    transactionsMap[accountId].unshift({
        desc,
        amount,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString()
    });

    saveTransactions();
}

// ========== WALLET CORE ==========
function updateWalletStats() {
    document.getElementById('totalAccounts').innerText = accounts.length;

    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
    const blocked = accounts.filter(a => a.status === 'Blocked').length;
    const totalTx = Object.values(transactionsMap).flat().length;

    document.getElementById('totalBalance').innerText = `R${totalBalance.toFixed(2)}`;
    document.getElementById('blockedAccounts').innerText = blocked;
    document.getElementById('totalTransactions').innerText = totalTx;
}

// ========== ACCOUNT ACTIONS ==========
function selectAccount(id) {
    selectedAccountId = id;
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;

    document.getElementById('selectedAccountInfo').style.display = 'block';
    document.getElementById('selAccountId').innerText = acc.id;
    document.getElementById('selHolderName').innerText = acc.name;
    document.getElementById('selBalance').innerText = `R${acc.balance.toFixed(2)}`;
}

function blockAccount() {
    if (!selectedAccountId) return showToast('Select account', 'error');

    const acc = accounts.find(a => a.id === selectedAccountId);
    acc.status = 'Blocked';

    saveAccounts();
    addTransaction(selectedAccountId, 'Blocked by Admin', 0);

    showToast('Account blocked', 'warning');
}

function unblockAccount() {
    if (!selectedAccountId) return showToast('Select account', 'error');

    const acc = accounts.find(a => a.id === selectedAccountId);
    acc.status = 'Active';

    saveAccounts();
    addTransaction(selectedAccountId, 'Unblocked by Admin', 0);

    showToast('Account active', 'success');
}

function topUp(amount) {
    if (!selectedAccountId) return showToast('Select account', 'error');

    const acc = accounts.find(a => a.id === selectedAccountId);
    acc.balance += amount;

    saveAccounts();
    addTransaction(selectedAccountId, `TopUp +R${amount}`, amount);

    showToast(`R${amount} added`, 'success');
}

// ========== EVENTS ==========
async function refreshTickets() {
    events = await loadEventsFromSupabase();
    renderEvents();
    showToast('Events refreshed', 'success');
}

function renderEvents() {
    const container = document.getElementById('fullEventCardContainer');
    if (!events.length) return;

    const e = events[0];

    container.innerHTML = `
        <div class="event-card-full">
            <div class="event-title-full">${escapeHtml(e.name)}</div>
            <div>${e.date}</div>
            <div>${e.location}</div>
        </div>
    `;
}

// ========== REFRESH ==========
function refreshData() {
    loadAllData();
    updateWalletStats();
    showToast('Refreshed', 'success');
}

// ========== INIT ==========
async function init() {
    loadAllData();
    events = await loadEventsFromSupabase();

    updateWalletStats();
    renderEvents();

    if (accounts.find(a => a.id === ADMIN.phone)) {
        selectAccount(ADMIN.phone);
    }

    console.log('✅ Admin Dashboard Clean Loaded');
}

// ========== EXPORT GLOBAL ==========
window.selectAccount = selectAccount;
window.blockAccount = blockAccount;
window.unblockAccount = unblockAccount;
window.topUp = topUp;
window.refreshData = refreshData;
window.refreshTickets = refreshTickets;

init();
