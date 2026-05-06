// ========== SUPABASE CONFIGURATION ==========
const SUPABASE_URL = 'https://fqbcidcezfprranfxhyj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxYmNpZGNlemZwcnJhbmZ4aHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MjY0ODgsImV4cCI6MjA5MzIwMjQ4OH0.eGCEE-lA8yLGjU1nFXv_A1RjbWvRbb5Mfm8FMzVRgHI';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== GLOBAL VARIABLES ==========
let accounts = [];
let events = [];
let refundRequests = [];
let staffActivity = [];
let selectedAccountId = null;
let selectedEventId = null;

const YOUR_PHONE = "0635713652";
const YOUR_NAME = "Mziwonke KaBuyaphi";

// ========== LOAD FUNCTIONS FROM SUPABASE ==========

async function loadAccountsFromSupabase() {
    try {
        const { data, error } = await supabase.from('accounts').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        accounts = data || [];
        console.log('✅ Loaded', accounts.length, 'accounts from Supabase');
        return accounts;
    } catch (err) {
        console.error('Failed to load accounts:', err);
        return [];
    }
}

async function loadTransactionsFromSupabase(accountId = null) {
    try {
        let query = supabase.from('transactions').select('*').order('created_at', { ascending: false });
        if (accountId) query = query.eq('account_id', accountId);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Failed to load transactions:', err);
        return [];
    }
}

async function loadEventsFromSupabase() {
    try {
        const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        if (data && data.length > 0) {
            const eventsList = data.map(supEvent => {
                let ticketTypes = {
                    earlyBird: { price: 250, capacity: 200, sold: 0 },
                    general: { price: 350, capacity: 400, sold: 0 },
                    vip: { price: 550, capacity: 80, sold: 0 }
                };
                
                if (supEvent.description) {
                    const desc = supEvent.description;
                    if (desc.includes('EarlyBird')) {
                        const ebMatch = desc.match(/EarlyBird: R(\d+)/);
                        if (ebMatch) ticketTypes.earlyBird.price = parseInt(ebMatch[1]);
                    }
                    if (desc.includes('General')) {
                        const genMatch = desc.match(/General R(\d+)/);
                        if (genMatch) ticketTypes.general.price = parseInt(genMatch[1]);
                    }
                    if (desc.includes('VIP')) {
                        const vipMatch = desc.match(/VIP R(\d+)/);
                        if (vipMatch) ticketTypes.vip.price = parseInt(vipMatch[1]);
                    }
                }
                
                return {
                    id: supEvent.id,
                    name: supEvent.name,
                    date: supEvent.start_time ? supEvent.start_time.split('T')[0] : new Date().toISOString().split('T')[0],
                    location: supEvent.location || 'Rands Cape Town',
                    status: 'active',
                    ticketTypes: ticketTypes
                };
            });
            console.log('✅ Loaded', eventsList.length, 'events from Supabase');
            return eventsList;
        }
        return [];
    } catch (err) {
        console.error('Failed to load events:', err);
        return [];
    }
}

async function loadTicketsFromSupabase() {
    try {
        const { data, error } = await supabase.from('tickets').select('*').order('purchase_date', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Failed to load tickets:', err);
        return [];
    }
}

async function loadRefundsFromSupabase() {
    try {
        const { data, error } = await supabase.from('refunds').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        refundRequests = data || [];
        return refundRequests;
    } catch (err) {
        console.error('Failed to load refunds:', err);
        return [];
    }
}

async function loadActivityFromSupabase() {
    try {
        const { data, error } = await supabase.from('staff_activity').select('*').order('timestamp', { ascending: false });
        if (error) throw error;
        staffActivity = data || [];
        return staffActivity;
    } catch (err) {
        console.error('Failed to load activity:', err);
        return [];
    }
}

// ========== SAVE FUNCTIONS TO SUPABASE ==========

async function saveAccountToSupabase(account) {
    try {
        const { error } = await supabase.from('accounts').upsert([{
            id: account.id,
            name: account.name,
            balance: account.balance,
            status: account.status
        }]);
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Failed to save account:', err);
        return false;
    }
}

async function addTransactionToSupabase(accountId, description, amount) {
    try {
        const now = new Date();
        const { error } = await supabase.from('transactions').insert([{
            account_id: accountId,
            description: description,
            amount: amount,
            date: now.toISOString().slice(0, 10),
            time: now.toLocaleTimeString()
        }]);
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Failed to save transaction:', err);
        return false;
    }
}

async function logStaffActivityToSupabase(action, details, targetId) {
    try {
        const now = new Date();
        const { error } = await supabase.from('staff_activity').insert([{
            action: action,
            details: details,
            target_id: targetId,
            admin: "Administrator",
            timestamp: now.toISOString(),
            time: now.toLocaleTimeString(),
            date: now.toISOString().slice(0, 10)
        }]);
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Failed to log activity:', err);
        return false;
    }
}

async function saveRefundToSupabase(refund) {
    try {
        const { error } = await supabase.from('refunds').upsert([refund]);
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Failed to save refund:', err);
        return false;
    }
}

async function updateRefundStatusInSupabase(refundId, status) {
    try {
        const { error } = await supabase.from('refunds').update({ status: status, processed_at: new Date().toISOString() }).eq('id', refundId);
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Failed to update refund:', err);
        return false;
    }
}

// ========== UI RENDER FUNCTIONS ==========

async function updateWalletStats() {
    await loadAccountsFromSupabase();
    document.getElementById('totalAccounts').innerText = accounts.length;
    let totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
    let blockedCount = accounts.filter(a => a.status === 'Blocked').length;
    document.getElementById('totalBalance').innerText = 'R' + totalBalance.toFixed(2);
    document.getElementById('blockedAccounts').innerText = blockedCount;
    const allTransactions = await loadTransactionsFromSupabase();
    document.getElementById('totalTransactions').innerText = allTransactions.length;
}

async function updateRefundStats() {
    await loadRefundsFromSupabase();
    const pending = refundRequests.filter(r => r.status === 'pending').length;
    const approved = refundRequests.filter(r => r.status === 'approved').length;
    const rejected = refundRequests.filter(r => r.status === 'rejected').length;
    const totalAmount = refundRequests.filter(r => r.status === 'approved').reduce((s, r) => s + (r.amount || 0), 0);
    document.getElementById('pendingRefunds').innerText = pending;
    document.getElementById('approvedRefunds').innerText = approved;
    document.getElementById('rejectedRefunds').innerText = rejected;
    document.getElementById('totalRefundAmount').innerText = 'R' + totalAmount.toFixed(2);
}

async function renderRefundRequests() {
    await loadRefundsFromSupabase();
    const container = document.getElementById('refundRequestsList');
    if (!container) return;
    if (refundRequests.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>📭</span><p>No refund requests</p></div>';
        return;
    }
    container.innerHTML = refundRequests.map(req => `<div class="refund-item"><div class="refund-info"><div class="refund-id">#${req.id}</div><div class="refund-details">${escapeHtml(req.user_phone || req.user_id)} • ${req.reason || 'No reason'}</div></div><div><div class="refund-amount">R${(req.amount || 0).toFixed(2)}</div><div class="refund-status ${req.status === 'pending' ? 'status-pending' : req.status === 'approved' ? 'status-approved' : 'status-rejected'}">${req.status?.toUpperCase() || 'PENDING'}</div>${req.status === 'pending' ? `<div style="display:flex; gap:5px; margin-top:8px;"><button class="action-btn success" style="padding:4px 10px; font-size:0.6rem;" onclick="approveRefund(${req.id})">Approve</button><button class="action-btn danger" style="padding:4px 10px; font-size:0.6rem;" onclick="rejectRefund(${req.id})">Reject</button></div>` : ''}</div></div>`).join('');
}

async function approveRefund(refundId) {
    await updateRefundStatusInSupabase(refundId, 'approved');
    await logStaffActivityToSupabase('APPROVE_REFUND', `Approved refund #${refundId}`, refundId);
    showToast(`Refund #${refundId} approved`, 'success');
    await renderRefundRequests();
    await updateRefundStats();
}

async function rejectRefund(refundId) {
    await updateRefundStatusInSupabase(refundId, 'rejected');
    await logStaffActivityToSupabase('REJECT_REFUND', `Rejected refund #${refundId}`, refundId);
    showToast(`Refund #${refundId} rejected`, 'warning');
    await renderRefundRequests();
    await updateRefundStats();
}

async function refreshRefunds() {
    await renderRefundRequests();
    await updateRefundStats();
    showToast('Refunds refreshed', 'success');
}

async function updateActivityStats() {
    await loadActivityFromSupabase();
    document.getElementById('totalActions').innerText = staffActivity.length;
    const today = new Date().toISOString().slice(0, 10);
    const todayActions = staffActivity.filter(a => a.date === today).length;
    document.getElementById('todayActions').innerText = todayActions;
    document.getElementById('adminActions').innerText = staffActivity.length;
}

async function renderActivityLog() {
    await loadActivityFromSupabase();
    const container = document.getElementById('activityLogList');
    if (!container) return;
    if (staffActivity.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>📭</span><p>No activity recorded yet</p></div>';
        return;
    }
    container.innerHTML = staffActivity.slice(0, 50).map(act => `<div class="activity-item"><div class="transaction-left"><div class="transaction-icon"><i class="fas fa-user-cog"></i></div><div class="transaction-details"><div class="transaction-type">${act.action.replace(/_/g, ' ')}</div><div class="transaction-time">${act.time} • ${act.date}</div><div style="font-size:0.65rem;">${escapeHtml(act.details)}</div></div></div></div>`).join('');
}

async function refreshActivityLog() {
    await renderActivityLog();
    await updateActivityStats();
    showToast('Activity log refreshed', 'success');
}

async function renderAccountList() {
    await loadAccountsFromSupabase();
    const searchTerm = document.getElementById('searchAccount')?.value.toLowerCase() || '';
    let filtered = accounts.filter(a => a.id.toLowerCase().includes(searchTerm) || (a.name && a.name.toLowerCase().includes(searchTerm)));
    const container = document.getElementById('accountList');
    if (!container) return;
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>📭</span><p>No accounts found</p></div>';
        return;
    }
    container.innerHTML = filtered.map(acc => `<div class="account-item ${selectedAccountId === acc.id ? 'selected' : ''}" onclick="selectAccount('${acc.id}')"><div class="account-info"><div class="account-id">${escapeHtml(acc.id)}${acc.id === YOUR_PHONE ? '<span class="your-account-badge"><i class="fas fa-star"></i> YOU</span>' : ''}</div><div class="account-name">${escapeHtml(acc.name || acc.id)}</div></div><div><div class="account-balance">R${(acc.balance || 0).toFixed(2)}</div><div class="account-status ${acc.status === 'Active' ? 'status-active' : 'status-blocked'}">${acc.status || 'Active'}</div></div></div>`).join('');
}

async function selectAccount(accountId) {
    selectedAccountId = accountId;
    await loadAccountsFromSupabase();
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return;
    const infoDiv = document.getElementById('selectedAccountInfo');
    if (infoDiv) infoDiv.style.display = 'block';
    const displaySpan = document.getElementById('selectedAccountDisplay');
    if (displaySpan) displaySpan.innerHTML = `Selected: ${acc.id}`;
    const idSpan = document.getElementById('selAccountId');
    if (idSpan) idSpan.innerText = acc.id;
    const nameSpan = document.getElementById('selHolderName');
    if (nameSpan) nameSpan.innerText = acc.name || acc.id;
    const balanceSpan = document.getElementById('selBalance');
    if (balanceSpan) balanceSpan.innerText = 'R' + (acc.balance || 0).toFixed(2);
    const statusEl = document.getElementById('selStatus');
    if (statusEl) {
        statusEl.innerText = acc.status || 'Active';
        statusEl.className = (acc.status === 'Active' || !acc.status) ? 'status-active' : 'status-blocked';
    }
    await renderAccountTransactions();
    await renderAccountList();
}

async function renderAccountTransactions() {
    const container = document.getElementById('accountTransactions');
    if (!container) return;
    if (!selectedAccountId) {
        container.innerHTML = '<div class="empty-state"><span>📭</span><p>Select an account</p></div>';
        return;
    }
    const txs = await loadTransactionsFromSupabase(selectedAccountId);
    if (txs.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>📭</span><p>No transactions yet</p></div>';
        return;
    }
    container.innerHTML = txs.slice(0, 8).map(tx => `<div class="transaction-item"><div class="transaction-left"><div class="transaction-icon"><i class="fas ${tx.amount > 0 ? 'fa-arrow-up' : 'fa-arrow-down'}"></i></div><div class="transaction-details"><div class="transaction-type">${escapeHtml(tx.description)}</div><div class="transaction-time">${tx.time || tx.date}</div></div></div><div class="transaction-amount ${tx.amount > 0 ? 'amount-positive' : 'amount-negative'}">${tx.amount > 0 ? '+' : ''}R${Math.abs(tx.amount).toFixed(2)}</div></div>`).join('');
}

async function blockSelectedAccount() {
    if (!selectedAccountId) { showToast('Select an account first', 'error'); return; }
    await loadAccountsFromSupabase();
    const acc = accounts.find(a => a.id === selectedAccountId);
    if (acc.status === 'Blocked') { showToast('Already blocked', 'warning'); return; }
    acc.status = 'Blocked';
    await saveAccountToSupabase(acc);
    await addTransactionToSupabase(selectedAccountId, 'Account Blocked by Admin', 0);
    await logStaffActivityToSupabase('BLOCK_ACCOUNT', `Blocked account ${selectedAccountId}`, selectedAccountId);
    await updateWalletStats();
    await renderAccountList();
    await selectAccount(selectedAccountId);
    showToast(`${selectedAccountId} blocked`, 'warning');
}

async function unblockSelectedAccount() {
    if (!selectedAccountId) { showToast('Select an account first', 'error'); return; }
    await loadAccountsFromSupabase();
    const acc = accounts.find(a => a.id === selectedAccountId);
    if (acc.status === 'Active') { showToast('Already active', 'warning'); return; }
    acc.status = 'Active';
    await saveAccountToSupabase(acc);
    await addTransactionToSupabase(selectedAccountId, 'Account Unblocked by Admin', 0);
    await logStaffActivityToSupabase('UNBLOCK_ACCOUNT', `Unblocked account ${selectedAccountId}`, selectedAccountId);
    await updateWalletStats();
    await renderAccountList();
    await selectAccount(selectedAccountId);
    showToast(`${selectedAccountId} unblocked`, 'success');
}

async function quickTopUp() {
    if (!selectedAccountId) { showToast('Select an account first', 'error'); return; }
    const amount = parseFloat(document.getElementById('quickTopupAmount').value);
    if (isNaN(amount) || amount <= 0) { showToast('Enter valid amount', 'error'); return; }
    await loadAccountsFromSupabase();
    const acc = accounts.find(a => a.id === selectedAccountId);
    acc.balance = (acc.balance || 0) + amount;
    await saveAccountToSupabase(acc);
    await addTransactionToSupabase(selectedAccountId, `Admin Top Up: +R${amount.toFixed(2)}`, amount);
    await logStaffActivityToSupabase('TOP_UP', `Topped up ${selectedAccountId} with R${amount.toFixed(2)}`, selectedAccountId);
    await updateWalletStats();
    await renderAccountList();
    const balanceSpan = document.getElementById('selBalance');
    if (balanceSpan) balanceSpan.innerText = 'R' + (acc.balance || 0).toFixed(2);
    await renderAccountTransactions();
    showToast(`R${amount.toFixed(2)} added`, 'success');
}

function openTopUpModal() {
    if (!selectedAccountId) { showToast('Select an account first', 'error'); return; }
    document.getElementById('modalAccountId').innerText = selectedAccountId;
    document.getElementById('topUpModal').classList.add('active');
}

async function confirmTopUp() {
    const amount = parseFloat(document.getElementById('modalTopupAmount').value);
    if (isNaN(amount) || amount <= 0) { showToast('Enter valid amount', 'error'); return; }
    await loadAccountsFromSupabase();
    const acc = accounts.find(a => a.id === selectedAccountId);
    acc.balance = (acc.balance || 0) + amount;
    await saveAccountToSupabase(acc);
    await addTransactionToSupabase(selectedAccountId, `Admin Top Up: +R${amount.toFixed(2)}`, amount);
    await logStaffActivityToSupabase('TOP_UP', `Topped up ${selectedAccountId} with R${amount.toFixed(2)}`, selectedAccountId);
    await updateWalletStats();
    await renderAccountList();
    const balanceSpan = document.getElementById('selBalance');
    if (balanceSpan) balanceSpan.innerText = 'R' + (acc.balance || 0).toFixed(2);
    await renderAccountTransactions();
    showToast(`R${amount.toFixed(2)} added`, 'success');
    closeModal();
}

async function updateTicketStats() {
    const tickets = await loadTicketsFromSupabase();
    await loadEventsFromSupabase();
    document.getElementById('totalTickets').innerText = tickets.length;
    document.getElementById('totalEvents').innerText = events.filter(e => e.status === 'active').length;
    const uniqueHolders = new Set(tickets.map(t => t.account_id)).size;
    document.getElementById('totalTicketHolders').innerText = uniqueHolders;
    let revenue = 0;
    for (let event of events) {
        for (let type in event.ticketTypes) {
            revenue += (event.ticketTypes[type].sold || 0) * (event.ticketTypes[type].price || 0);
        }
    }
    document.getElementById('totalRevenue').innerText = 'R' + revenue.toLocaleString();
}

async function renderFullEventCard() {
    await loadEventsFromSupabase();
    const container = document.getElementById('fullEventCardContainer');
    if (!container) return;
    if (!events.length) {
        container.innerHTML = '<div class="empty-state" style="background:white; border-radius:28px; padding:30px;"><i class="fas fa-calendar-times" style="font-size:48px; color:#E30613;"></i><p style="margin-top:12px;">No events yet. Click "Add Event"</p></div>';
        return;
    }
    const event = selectedEventId ? events.find(e => e.id == selectedEventId) : events[0];
    if (!event) return;
    const totalSold = (event.ticketTypes.earlyBird?.sold || 0) + (event.ticketTypes.general?.sold || 0) + (event.ticketTypes.vip?.sold || 0);
    const totalCap = (event.ticketTypes.earlyBird?.capacity || 0) + (event.ticketTypes.general?.capacity || 0) + (event.ticketTypes.vip?.capacity || 0);
    const percent = totalCap ? Math.round((totalSold / totalCap) * 100) : 0;
    const statusClass = event.status === 'active' ? 'active' : (event.status === 'upcoming' ? 'upcoming' : 'ended');
    container.innerHTML = `<div class="event-card-full"><div class="event-banner-full"><span class="event-status-badge-full ${statusClass}">${event.status === 'active' ? '🔥 LIVE' : event.status.toUpperCase()}</span></div><div class="event-content-full"><div class="event-title-full">${escapeHtml(event.name)}</div><div><i class="fas fa-calendar-alt"></i> ${event.date || 'TBD'}</div><div><i class="fas fa-map-marker-alt"></i> ${escapeHtml(event.location || 'Rands Cape Town')}</div><div class="ticket-types-full">${event.ticketTypes.earlyBird ? `<div class="ticket-row-full"><span>🎟️ Early Bird</span><span>R${event.ticketTypes.earlyBird.price}</span><span>${event.ticketTypes.earlyBird.sold} sold</span></div>` : ''}${event.ticketTypes.general ? `<div class="ticket-row-full"><span>👥 General Admission</span><span>R${event.ticketTypes.general.price}</span><span>${event.ticketTypes.general.sold} sold</span></div>` : ''}${event.ticketTypes.vip ? `<div class="ticket-row-full"><span>👑 VIP Experience</span><span>R${event.ticketTypes.vip.price}</span><span>${event.ticketTypes.vip.sold} sold</span></div>` : ''}</div><div class="event-actions-full"><button class="action-btn-full view" onclick="viewEventDetails('${event.id}')"><i class="fas fa-eye"></i> View</button><button class="action-btn-full edit" onclick="openEditTicketModalById('${event.id}')"><i class="fas fa-edit"></i> Edit</button><button class="action-btn-full delete" onclick="deleteSelectedEventById('${event.id}')"><i class="fas fa-trash"></i> Delete</button><button class="action-btn-full duplicate" onclick="duplicateEvent('${event.id}')"><i class="fas fa-copy"></i> Duplicate</button></div></div></div>`;
}

function viewEventDetails(id) {
    const ev = events.find(e => e.id == id);
    if (ev) alert(`🎉 ${ev.name}\nDate: ${ev.date}\nSold: ${(ev.ticketTypes.earlyBird?.sold || 0)+(ev.ticketTypes.general?.sold || 0)+(ev.ticketTypes.vip?.sold || 0)}`);
}

function duplicateEvent(id) {
    const original = events.find(e => e.id == id);
    if (!original) return;
    const newEvent = JSON.parse(JSON.stringify(original));
    newEvent.id = 'evt_' + Date.now();
    newEvent.name = original.name + " (Copy)";
    if(newEvent.ticketTypes.earlyBird) newEvent.ticketTypes.earlyBird.sold = 0;
    if(newEvent.ticketTypes.general) newEvent.ticketTypes.general.sold = 0;
    if(newEvent.ticketTypes.vip) newEvent.ticketTypes.vip.sold = 0;
    events.push(newEvent);
    showToast(`Event duplicated: ${newEvent.name}`, 'success');
    renderFullEventCard();
    updateTicketStats();
}

function openEditTicketModalById(id) {
    const ev = events.find(e => e.id == id);
    if (ev) {
        selectedEventId = id;
        openEditTicketModal();
    }
}

async function deleteSelectedEventById(id) {
    if (confirm('Delete this event permanently?')) {
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) {
            showToast('Error deleting event', 'error');
            return;
        }
        events = events.filter(e => e.id != id);
        if (selectedEventId == id) selectedEventId = null;
        await renderFullEventCard();
        await updateTicketStats();
        showToast('Event deleted', 'success');
    }
}

async function selectEvent(eventId) {
    selectedEventId = eventId;
    await loadEventsFromSupabase();
    const ev = events.find(e => e.id == eventId);
    if (!ev) return;
    const infoDiv = document.getElementById('selectedEventInfo');
    if (infoDiv) infoDiv.style.display = 'block';
    const nameSpan = document.getElementById('selEventName');
    if (nameSpan) nameSpan.innerText = ev.name;
    const dateSpan = document.getElementById('selEventDate');
    if (dateSpan) dateSpan.innerText = ev.date;
    const locSpan = document.getElementById('selEventLocation');
    if (locSpan) locSpan.innerText = ev.location || 'TBA';
    await renderTicketInventory();
    await renderEventPurchases();
    await renderFullEventCard();
}

async function renderTicketInventory() {
    const container = document.getElementById('ticketInventory');
    if (!container) return;
    if (!selectedEventId) {
        container.innerHTML = '<div class="empty-state"><span>🎟️</span><p>Select an event</p></div>';
        return;
    }
    await loadEventsFromSupabase();
    const ev = events.find(e => e.id == selectedEventId);
    if (!ev) return;
    const types = [{ key: 'earlyBird', label: '🐦 Early Bird' }, { key: 'general', label: '🎟️ General' }, { key: 'vip', label: '👑 VIP' }];
    container.innerHTML = types.map(t => {
        const data = ev.ticketTypes[t.key];
        if (!data) return '';
        const remaining = data.capacity - data.sold;
        return `<div class="transaction-item"><div class="transaction-left"><div class="transaction-icon"><i class="fas fa-ticket-alt"></i></div><div class="transaction-details"><div class="transaction-type">${t.label}</div><div class="transaction-time">Price: R${data.price} | Cap: ${data.capacity}</div></div></div><div class="transaction-amount amount-positive">Sold: ${data.sold}<br><span style="font-size:0.6rem;">Left: ${remaining}</span></div></div>`;
    }).join('');
}

async function renderEventPurchases() {
    const container = document.getElementById('eventPurchases');
    if (!container) return;
    if (!selectedEventId) {
        container.innerHTML = '<div class="empty-state"><span>📭</span><p>Select an event</p></div>';
        return;
    }
    await loadEventsFromSupabase();
    const ev = events.find(e => e.id == selectedEventId);
    const tickets = await loadTicketsFromSupabase();
    const eventTickets = tickets.filter(t => t.event_name === ev.name);
    if (eventTickets.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>🎫</span><p>No tickets purchased</p></div>';
        return;
    }
    container.innerHTML = eventTickets.map(t => `<div class="transaction-item"><div class="transaction-left"><div class="transaction-icon"><i class="fas fa-user"></i></div><div class="transaction-details"><div class="transaction-type">${escapeHtml(t.ticket_type)}</div><div class="transaction-time">ID: ${t.ticket_id?.slice(-12)}</div></div></div><div class="transaction-amount amount-positive">R${t.price?.toFixed(2) || 0}</div></div>`).join('');
}

function openAddEventModal() { 
    document.getElementById('addEventModal').classList.add('active'); 
}

function closeAddEventModal() { 
    document.getElementById('addEventModal').classList.remove('active'); 
}

function toggleTicketFields(type) {
    const fields = document.getElementById(`${type}Fields`);
    if(fields) {
        fields.classList.toggle('active');
        const icon = fields.parentElement.querySelector('.toggle-icon i');
        if(icon) icon.className = fields.classList.contains('active') ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    }
}

async function confirmAddEvent() {
    const name = document.getElementById('newEventName').value;
    const date = document.getElementById('newEventDate').value;
    const location = document.getElementById('newEventLocation').value.trim() || 'Rands Cape Town';
    
    if (!name || !date) { showToast('Event name and date required', 'error'); return; }
    
    const earlyBirdPrice = parseFloat(document.getElementById('newEarlyBirdPrice').value) || 0;
    const earlyBirdCap = parseInt(document.getElementById('newEarlyBirdCapacity').value) || 0;
    const generalPrice = parseFloat(document.getElementById('newGeneralPrice').value) || 0;
    const generalCap = parseInt(document.getElementById('newGeneralCapacity').value) || 0;
    const vipPrice = parseFloat(document.getElementById('newVipPrice').value) || 0;
    const vipCap = parseInt(document.getElementById('newVipCapacity').value) || 0;
    
    if(earlyBirdPrice === 0 && generalPrice === 0 && vipPrice === 0) {
        showToast('Add at least one ticket type with price', 'error');
        return;
    }
    
    showToast('Saving event to database...', 'success');
    
    const { error } = await supabase.from('events').insert([{ 
        name: name, 
        location: location, 
        start_time: date, 
        description: `Tickets: EarlyBird R${earlyBirdPrice}/${earlyBirdCap} | General R${generalPrice}/${generalCap} | VIP R${vipPrice}/${vipCap}`
    }]);
    
    if (error) {
        console.error('❌ Supabase error:', error);
        showToast('Database error: ' + error.message, 'error');
    } else {
        showToast(`Event "${name}" saved to database!`, 'success');
        const freshEvents = await loadEventsFromSupabase();
        events = freshEvents;
        await renderFullEventCard();
        await updateTicketStats();
        if (events.length > 0 && !selectedEventId) {
            selectedEventId = events[0].id;
            await selectEvent(selectedEventId);
        }
    }
    
    closeAddEventModal();
    document.getElementById('newEventName').value = '';
    document.getElementById('newEventDate').value = '';
    document.getElementById('newEventLocation').value = 'Rands Cape Town';
    ['newEarlyBirdPrice','newEarlyBirdCapacity','newGeneralPrice','newGeneralCapacity','newVipPrice','newVipCapacity'].forEach(id => {
        if(document.getElementById(id)) document.getElementById(id).value = '';
    });
}

async function deleteSelectedEvent() {
    if (!selectedEventId) { showToast('Select an event first', 'error'); return; }
    if (confirm('Delete selected event?')) {
        const { error } = await supabase.from('events').delete().eq('id', selectedEventId);
        if (error) {
            showToast('Error deleting event', 'error');
            return;
        }
        events = events.filter(e => e.id != selectedEventId);
        selectedEventId = null;
        const infoDiv = document.getElementById('selectedEventInfo');
        if (infoDiv) infoDiv.style.display = 'none';
        await renderFullEventCard();
        await updateTicketStats();
        showToast('Event deleted', 'success');
    }
}

function openEditTicketModal() {
    if (!selectedEventId) { showToast('Select an event first', 'error'); return; }
    const ev = events.find(e => e.id == selectedEventId);
    document.getElementById('editEventNameDisplay').innerHTML = ev.name;
    document.getElementById('editEarlyBirdPrice').value = ev.ticketTypes.earlyBird?.price || '';
    document.getElementById('editEarlyBirdCapacity').value = ev.ticketTypes.earlyBird?.capacity || '';
    document.getElementById('editGeneralPrice').value = ev.ticketTypes.general?.price || '';
    document.getElementById('editGeneralCapacity').value = ev.ticketTypes.general?.capacity || '';
    document.getElementById('editVipPrice').value = ev.ticketTypes.vip?.price || '';
    document.getElementById('editVipCapacity').value = ev.ticketTypes.vip?.capacity || '';
    document.getElementById('editTicketModal').classList.add('active');
}

function closeEditTicketModal() { 
    document.getElementById('editTicketModal').classList.remove('active'); 
}

function confirmEditTickets() {
    if (!selectedEventId) return;
    const ev = events.find(e => e.id == selectedEventId);
    const ebPrice = parseFloat(document.getElementById('editEarlyBirdPrice').value);
    const ebCap = parseInt(document.getElementById('editEarlyBirdCapacity').value);
    const genPrice = parseFloat(document.getElementById('editGeneralPrice').value);
    const genCap = parseInt(document.getElementById('editGeneralCapacity').value);
    const vipPrice = parseFloat(document.getElementById('editVipPrice').value);
    const vipCap = parseInt(document.getElementById('editVipCapacity').value);
    if(ebPrice && ebCap) ev.ticketTypes.earlyBird = { price: ebPrice, capacity: ebCap, sold: ev.ticketTypes.earlyBird?.sold || 0 };
    if(genPrice && genCap) ev.ticketTypes.general = { price: genPrice, capacity: genCap, sold: ev.ticketTypes.general?.sold || 0 };
    if(vipPrice && vipCap) ev.ticketTypes.vip = { price: vipPrice, capacity: vipCap, sold: ev.ticketTypes.vip?.sold || 0 };
    renderTicketInventory();
    updateTicketStats();
    renderFullEventCard();
    showToast('Ticket inventory updated', 'success');
    closeEditTicketModal();
}

async function renderGlobalActivity() {
    const allTransactions = await loadTransactionsFromSupabase();
    const recent = allTransactions.slice(0, 12);
    const container = document.getElementById('globalActivity');
    if (!container) return;
    if (recent.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>📭</span><p>No recent activity</p></div>';
        return;
    }
    container.innerHTML = recent.map(tx => `<div class="transaction-item"><div class="transaction-left"><div class="transaction-icon"><i class="fas ${tx.amount > 0 ? 'fa-arrow-up' : 'fa-arrow-down'}"></i></div><div class="transaction-details"><div class="transaction-type">${escapeHtml(tx.description)}</div><div class="transaction-time">${tx.account_id}</div></div></div><div class="transaction-amount ${tx.amount > 0 ? 'amount-positive' : 'amount-negative'}">${tx.amount > 0 ? '+' : ''}R${Math.abs(tx.amount).toFixed(2)}</div></div>`).join('');
}

function filterAccounts() { renderAccountList(); }
function setQuickAmount(amt) { document.getElementById('quickTopupAmount').value = amt; }
function setModalAmount(amt) { document.getElementById('modalTopupAmount').value = amt; }
function closeModal() { document.getElementById('topUpModal').classList.remove('active'); }

async function refreshData() {
    await loadAccountsFromSupabase();
    await updateWalletStats();
    await renderAccountList();
    await renderGlobalActivity();
    if (selectedAccountId) await selectAccount(selectedAccountId);
    showToast('Refreshed', 'success');
}

async function refreshTickets() {
    const freshEvents = await loadEventsFromSupabase();
    events = freshEvents;
    await updateTicketStats();
    await renderFullEventCard();
    if (events.length > 0 && !selectedEventId) {
        selectedEventId = events[0].id;
        await selectEvent(selectedEventId);
    } else if (selectedEventId && events.find(e => e.id == selectedEventId)) {
        await selectEvent(selectedEventId);
    } else if (events.length > 0) {
        selectedEventId = events[0].id;
        await selectEvent(selectedEventId);
    }
    showToast('Events refreshed from database', 'success');
}

// ========== TAB SWITCH FUNCTION ==========
window.switchTab = function(tab) {
    console.log('Switching to tab:', tab);
    
    const walletTab = document.getElementById('walletTab');
    const ticketsTab = document.getElementById('ticketsTab');
    const activityTab = document.getElementById('activityTab');
    
    if (walletTab) walletTab.style.display = tab === 'wallet' ? 'block' : 'none';
    if (ticketsTab) ticketsTab.style.display = tab === 'tickets' ? 'block' : 'none';
    if (activityTab) activityTab.style.display = tab === 'activity' ? 'block' : 'none';
    
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach((btn) => {
        const btnText = btn.innerText.toLowerCase();
        let btnTab = 'tickets';
        if (btnText.includes('passport')) btnTab = 'wallet';
        else if (btnText.includes('ticket')) btnTab = 'tickets';
        else if (btnText.includes('activity')) btnTab = 'activity';
        
        if (btnTab === tab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    if (tab === 'tickets') {
        updateTicketStats();
        renderFullEventCard();
        if (events.length > 0 && !selectedEventId) selectEvent(events[0].id);
    } else if (tab === 'wallet') {
        updateWalletStats();
        renderAccountList();
        updateRefundStats();
        renderRefundRequests();
    } else if (tab === 'activity') {
        updateActivityStats();
        renderActivityLog();
    }
};

function showToast(message, type) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    document.getElementById('toastIcon').innerText = type === 'success' ? '✅' : (type === 'error' ? '❌' : '⚠️');
    document.getElementById('toastMessage').innerText = message;
    toast.className = `toast ${type === 'success' ? 'success' : (type === 'error' ? 'error' : 'warning')} show`;
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Expose ALL functions to window
window.selectAccount = selectAccount;
window.blockSelectedAccount = blockSelectedAccount;
window.unblockSelectedAccount = unblockSelectedAccount;
window.quickTopUp = quickTopUp;
window.openTopUpModal = openTopUpModal;
window.confirmTopUp = confirmTopUp;
window.closeModal = closeModal;
window.setQuickAmount = setQuickAmount;
window.setModalAmount = setModalAmount;
window.filterAccounts = filterAccounts;
window.refreshData = refreshData;
window.refreshTickets = refreshTickets;
window.refreshRefunds = refreshRefunds;
window.refreshActivityLog = refreshActivityLog;
window.approveRefund = approveRefund;
window.rejectRefund = rejectRefund;
window.openAddEventModal = openAddEventModal;
window.closeAddEventModal = closeAddEventModal;
window.confirmAddEvent = confirmAddEvent;
window.toggleTicketFields = toggleTicketFields;
window.deleteSelectedEvent = deleteSelectedEvent;
window.openEditTicketModal = openEditTicketModal;
window.closeEditTicketModal = closeEditTicketModal;
window.confirmEditTickets = confirmEditTickets;
window.viewEventDetails = viewEventDetails;
window.duplicateEvent = duplicateEvent;
window.openEditTicketModalById = openEditTicketModalById;
window.deleteSelectedEventById = deleteSelectedEventById;
window.selectEvent = selectEvent;

// Initialize
async function init() {
    console.log('🚀 Initializing with Supabase...');
    await loadAccountsFromSupabase();
    events = await loadEventsFromSupabase();
    await updateWalletStats();
    await renderAccountList();
    await renderFullEventCard();
    await renderGlobalActivity();
    await updateRefundStats();
    await renderRefundRequests();
    await updateActivityStats();
    await renderActivityLog();
    
    if (accounts.find(a => a.id === YOUR_PHONE)) await selectAccount(YOUR_PHONE);
    if (events.length > 0 && !selectedEventId) {
        selectedEventId = events[0].id;
        await selectEvent(selectedEventId);
    }
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const ticketsBtn = document.querySelector('.tab-btn:nth-child(2)');
    if (ticketsBtn) ticketsBtn.classList.add('active');
    
    console.log('✅ Ready - ALL data in Supabase!');
}

init();