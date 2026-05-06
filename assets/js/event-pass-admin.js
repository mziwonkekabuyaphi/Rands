/**
 * Event Pass Admin Dashboard - CLEAN VERSION
 * Source of truth: Supabase (events) + localStorage (wallet only)
 */

import { supabase } from '../../config/supabase.js';

// ===================== STORAGE KEYS =====================
const ACCOUNTS_KEY = 'rands_accounts_v2';
const TRANSACTIONS_KEY = 'rands_transactions';
const TICKETS_KEY = 'rands_tickets';
const REFUNDS_KEY = 'rands_refund_requests';
const ACTIVITY_KEY = 'rands_staff_activity';

// ===================== ADMIN =====================
const YOUR_PHONE = "0635713652";
const YOUR_NAME = "Mziwonke KaBuyaphi";
const YOUR_BALANCE = 12580.50;

// ===================== STATE =====================
let accounts = [];
let transactionsMap = {};
let events = [];
let refundRequests = [];
let staffActivity = [];

let selectedAccountId = null;
let selectedEventId = null;

// ===================== UTILS =====================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const msg = document.getElementById('toastMessage');

    icon.innerText =
        type === 'success' ? '✅' :
        type === 'error' ? '❌' : '⚠️';

    toast.className = `toast ${type} show`;
    msg.innerText = message;

    setTimeout(() => toast.classList.remove('show'), 2500);
}

function escapeHtml(str = '') {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===================== SUPABASE EVENTS (SOURCE OF TRUTH) =====================
async function loadEvents() {
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
        location: e.location || 'Rands Cape Town',
        status: 'active',
        ticketTypes: parseTicketTypes(e.description)
    }));
}

function parseTicketTypes(desc = '') {
    return {
        earlyBird: extract(desc, /EarlyBird R(\d+)\/(\d+)/),
        general: extract(desc, /General R(\d+)\/(\d+)/),
        vip: extract(desc, /VIP R(\d+)\/(\d+)/)
    };
}

function extract(text, regex) {
    const m = text.match(regex);
    if (!m) return { price: 0, capacity: 0, sold: 0 };
    return {
        price: parseInt(m[1]),
        capacity: parseInt(m[2]),
        sold: 0
    };
}

// ===================== WALLET (LOCAL ONLY) =====================
function loadAccounts() {
    accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');

    if (!accounts.find(a => a.id === YOUR_PHONE)) {
        accounts.push({
            id: YOUR_PHONE,
            name: YOUR_NAME,
            balance: YOUR_BALANCE,
            status: 'Active'
        });
    }
}

function saveAccounts() {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

// ===================== RENDER EVENTS (FIXED CORE BUG) =====================
function renderEvents() {
    const container = document.getElementById('fullEventCardContainer');
    if (!container) return;

    if (!events.length) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No events found</p>
            </div>`;
        return;
    }

    const event = events.find(e => e.id === selectedEventId) || events[0];
    selectedEventId = event.id;

    const totalSold =
        (event.ticketTypes.earlyBird?.sold || 0) +
        (event.ticketTypes.general?.sold || 0) +
        (event.ticketTypes.vip?.sold || 0);

    const totalCap =
        (event.ticketTypes.earlyBird?.capacity || 0) +
        (event.ticketTypes.general?.capacity || 0) +
        (event.ticketTypes.vip?.capacity || 0);

    const percent = totalCap ? Math.round((totalSold / totalCap) * 100) : 0;

    container.innerHTML = `
        <div class="event-card-full">
            <div class="event-content-full">
                <h2>${escapeHtml(event.name)}</h2>

                <p>${event.date}</p>
                <p>${escapeHtml(event.location)}</p>

                <hr />

                <p>Early Bird: R${event.ticketTypes.earlyBird.price}</p>
                <p>General: R${event.ticketTypes.general.price}</p>
                <p>VIP: R${event.ticketTypes.vip.price}</p>

                <hr />

                <p>Sold: ${totalSold}</p>
                <p>Capacity: ${totalCap}</p>
                <p>${percent}% filled</p>
            </div>
        </div>
    `;
}

// ===================== ACCOUNT UI =====================
function updateWalletStats() {
    const total = accounts.reduce((s, a) => s + a.balance, 0);

    document.getElementById('totalAccounts').innerText = accounts.length;
    document.getElementById('totalBalance').innerText = 'R' + total.toFixed(2);
}

// ===================== REFRESH =====================
async function refreshEvents() {
    events = await loadEvents();
    renderEvents();
}

// ===================== INIT =====================
async function init() {
    loadAccounts();
    events = await loadEvents();

    updateWalletStats();
    renderEvents();
}

// ===================== GLOBAL EXPORTS =====================
window.refreshEvents = refreshEvents;

// ===================== START =====================
init();
