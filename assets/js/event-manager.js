const SUPABASE_URL = 'https://qrjlgfajglvkbifhlebc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyamxnZmFqZ2x2a2JpZmhsZWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMjAzOTAsImV4cCI6MjA5MjY5NjM5MH0.dBj6kPPyBE7LwrZZudyNkUsFcq_8NJBIXCJcNH41ajY';
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('✅ Supabase connected');

// Function to load events ONLY from Supabase (no localStorage)
async function loadEventsFromSupabase() {
    try {
        const { data, error } = await window.supabaseClient
            .from('events')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Supabase load error:', error);
            showToast('Failed to load events from database', 'error');
            return [];
        }
        
        if (data && data.length > 0) {
            // Convert Supabase events to your event format
            const eventsList = data.map(supEvent => {
                // Default ticket types if none exist
                let ticketTypes = {
                    earlyBird: { price: 250, capacity: 200, sold: 0 },
                    general: { price: 350, capacity: 400, sold: 0 },
                    vip: { price: 550, capacity: 80, sold: 0 }
                };
                
                // Try to parse description for ticket info
                if (supEvent.description) {
                    const desc = supEvent.description;
                    if (desc.includes('EarlyBird')) {
                        const ebMatch = desc.match(/EarlyBird: R(\d+)/);
                        if (ebMatch) ticketTypes.earlyBird.price = parseInt(ebMatch[1]);
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
        console.error('Failed to load from Supabase:', err);
        return [];
    }
}

// ========== ALL ORIGINAL DATA STRUCTURE PRESERVED ==========
const ACCOUNTS_KEY = 'rands_accounts_v2';
const TRANSACTIONS_KEY = 'rands_transactions';
const TICKETS_KEY = 'rands_tickets';
const REFUNDS_KEY = 'rands_refund_requests';
const ACTIVITY_KEY = 'rands_staff_activity';
let accounts = [], transactionsMap = {}, events = [], refundRequests = [], staffActivity = [], selectedAccountId = null, selectedEventId = null;
const YOUR_PHONE = "0635713652", YOUR_NAME = "Mziwonke KaBuyaphi", YOUR_BALANCE = 12580.50;

function logStaffActivity(action, details, targetId) { const activity = { id: Date.now(), action, details, targetId, timestamp: new Date().toISOString(), time: new Date().toLocaleTimeString(), date: new Date().toISOString().slice(0,10), admin: "Administrator" }; staffActivity.unshift(activity); if (staffActivity.length > 200) staffActivity = staffActivity.slice(0,200); localStorage.setItem(ACTIVITY_KEY, JSON.stringify(staffActivity)); }
function loadActivityLog() { const stored = localStorage.getItem(ACTIVITY_KEY); staffActivity = stored ? JSON.parse(stored) : []; }
function loadRefunds() { const stored = localStorage.getItem(REFUNDS_KEY); refundRequests = stored ? JSON.parse(stored) : []; }
function saveRefunds() { localStorage.setItem(REFUNDS_KEY, JSON.stringify(refundRequests)); }

// UPDATED: Load accounts from localStorage, events ONLY from Supabase
function loadAllData() { 
    const storedAccounts = localStorage.getItem(ACCOUNTS_KEY); 
    accounts = storedAccounts ? JSON.parse(storedAccounts) : []; 
    if (!accounts.find(a => a.id === YOUR_PHONE)) accounts.push({ id: YOUR_PHONE, name: YOUR_NAME, balance: YOUR_BALANCE, status: "Active" }); 
    const storedTransactions = localStorage.getItem(TRANSACTIONS_KEY); 
    transactionsMap = storedTransactions ? JSON.parse(storedTransactions) : {}; 
    loadRefunds(); 
    loadActivityLog(); 
}

function saveAccounts() { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); }
function saveTransactions() { localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactionsMap)); }
function saveEventsToLocal() { localStorage.setItem('rands_events_supabase_backup', JSON.stringify(events)); }
function loadTickets() { const stored = localStorage.getItem(TICKETS_KEY); return stored ? JSON.parse(stored) : []; }
function addTransaction(accountId, desc, amount) { if (!transactionsMap[accountId]) transactionsMap[accountId] = []; transactionsMap[accountId].unshift({ desc, amount, date: new Date().toISOString().slice(0,10), time: new Date().toLocaleTimeString() }); saveTransactions(); renderGlobalActivity(); }
function updateWalletStats() { document.getElementById('totalAccounts').innerText = accounts.length; let totalBalance = accounts.reduce((s,a) => s + a.balance, 0); let blockedCount = accounts.filter(a => a.status === 'Blocked').length; document.getElementById('totalBalance').innerText = 'R' + totalBalance.toFixed(2); document.getElementById('blockedAccounts').innerText = blockedCount; let totalTx = Object.values(transactionsMap).reduce((s,t) => s + t.length, 0); document.getElementById('totalTransactions').innerText = totalTx; }
function updateRefundStats() { const pending = refundRequests.filter(r => r.status === 'pending').length; const approved = refundRequests.filter(r => r.status === 'approved').length; const rejected = refundRequests.filter(r => r.status === 'rejected').length; const totalAmount = refundRequests.filter(r => r.status === 'approved').reduce((s, r) => s + (r.amount || 0), 0); document.getElementById('pendingRefunds').innerText = pending; document.getElementById('approvedRefunds').innerText = approved; document.getElementById('rejectedRefunds').innerText = rejected; document.getElementById('totalRefundAmount').innerText = 'R' + totalAmount.toFixed(2); }
function renderRefundRequests() { const container = document.getElementById('refundRequestsList'); if (refundRequests.length === 0) { container.innerHTML = '<div class="empty-state"><span>📭</span><p>No refund requests</p></div>'; return; } container.innerHTML = refundRequests.map(req => `<div class="refund-item"><div class="refund-info"><div class="refund-id">#${req.id}</div><div class="refund-details">${escapeHtml(req.userPhone || req.userId)} • ${req.reason || 'No reason'}</div></div><div><div class="refund-amount">R${(req.amount || 0).toFixed(2)}</div><div class="refund-status ${req.status === 'pending' ? 'status-pending' : req.status === 'approved' ? 'status-approved' : 'status-rejected'}">${req.status?.toUpperCase() || 'PENDING'}</div>${req.status === 'pending' ? `<div style="display:flex; gap:5px; margin-top:8px;"><button class="action-btn success" style="padding:4px 10px; font-size:0.6rem;" onclick="approveRefund(${req.id})">Approve</button><button class="action-btn danger" style="padding:4px 10px; font-size:0.6rem;" onclick="rejectRefund(${req.id})">Reject</button></div>` : ''}</div></div>`).join(''); }
function approveRefund(refundId) { const refund = refundRequests.find(r => r.id === refundId); if (!refund) return; refund.status = 'approved'; refund.processedAt = new Date().toISOString(); saveRefunds(); logStaffActivity('APPROVE_REFUND', `Approved refund #${refundId}`, refund.userId); showToast(`Refund #${refundId} approved`, 'success'); updateRefundStats(); renderRefundRequests(); }
function rejectRefund(refundId) { const refund = refundRequests.find(r => r.id === refundId); if (!refund) return; refund.status = 'rejected'; saveRefunds(); logStaffActivity('REJECT_REFUND', `Rejected refund #${refundId}`, refund.userId); showToast(`Refund #${refundId} rejected`, 'warning'); updateRefundStats(); renderRefundRequests(); }
function refreshRefunds() { loadRefunds(); updateRefundStats(); renderRefundRequests(); showToast('Refunds refreshed', 'success'); }
function updateActivityStats() { document.getElementById('totalActions').innerText = staffActivity.length; const today = new Date().toISOString().slice(0,10); const todayActions = staffActivity.filter(a => a.date === today).length; document.getElementById('todayActions').innerText = todayActions; document.getElementById('adminActions').innerText = staffActivity.length; }
function renderActivityLog() { const container = document.getElementById('activityLogList'); if (staffActivity.length === 0) { container.innerHTML = '<div class="empty-state"><span>📭</span><p>No activity recorded yet</p></div>'; return; } container.innerHTML = staffActivity.slice(0,50).map(act => `<div class="activity-item"><div class="transaction-left"><div class="transaction-icon"><i class="fas fa-user-cog"></i></div><div class="transaction-details"><div class="transaction-type">${act.action.replace(/_/g, ' ')}</div><div class="transaction-time">${act.time} • ${act.date}</div><div style="font-size:0.65rem;">${escapeHtml(act.details)}</div></div></div></div>`).join(''); }
function refreshActivityLog() { loadActivityLog(); updateActivityStats(); renderActivityLog(); showToast('Activity log refreshed', 'success'); }
function renderAccountList() { const searchTerm = document.getElementById('searchAccount')?.value.toLowerCase() || ''; let filtered = accounts.filter(a => a.id.toLowerCase().includes(searchTerm) || (a.name && a.name.toLowerCase().includes(searchTerm))); const container = document.getElementById('accountList'); if (filtered.length === 0) { container.innerHTML = '<div class="empty-state"><span>📭</span><p>No accounts found</p></div>'; return; } container.innerHTML = filtered.map(acc => `<div class="account-item ${selectedAccountId === acc.id ? 'selected' : ''}" onclick="selectAccount('${acc.id}')"><div class="account-info"><div class="account-id">${escapeHtml(acc.id)}${acc.id === YOUR_PHONE ? '<span class="your-account-badge"><i class="fas fa-star"></i> YOU</span>' : ''}</div><div class="account-name">${escapeHtml(acc.name || acc.id)}</div></div><div><div class="account-balance">R${acc.balance.toFixed(2)}</div><div class="account-status ${acc.status === 'Active' ? 'status-active' : 'status-blocked'}">${acc.status || 'Active'}</div></div></div>`).join(''); }
function selectAccount(accountId) { selectedAccountId = accountId; const acc = accounts.find(a => a.id === accountId); if (!acc) return; document.getElementById('selectedAccountInfo').style.display = 'block'; document.getElementById('selectedAccountDisplay').innerHTML = `Selected: ${acc.id}`; document.getElementById('selAccountId').innerText = acc.id; document.getElementById('selHolderName').innerText = acc.name || acc.id; document.getElementById('selBalance').innerText = 'R' + acc.balance.toFixed(2); const statusEl = document.getElementById('selStatus'); statusEl.innerText = acc.status || 'Active'; statusEl.className = (acc.status === 'Active' || !acc.status) ? 'status-active' : 'status-blocked'; renderAccountTransactions(); renderAccountList(); }
function renderAccountTransactions() { const container = document.getElementById('accountTransactions'); if (!selectedAccountId) { container.innerHTML = '<div class="empty-state"><span>📭</span><p>Select an account</p></div>'; return; } const txs = transactionsMap[selectedAccountId] || []; if (txs.length === 0) { container.innerHTML = '<div class="empty-state"><span>📭</span><p>No transactions yet</p></div>'; return; } container.innerHTML = txs.slice(0,8).map(tx => `<div class="transaction-item"><div class="transaction-left"><div class="transaction-icon"><i class="fas ${tx.amount > 0 ? 'fa-arrow-up' : 'fa-arrow-down'}"></i></div><div class="transaction-details"><div class="transaction-type">${escapeHtml(tx.desc)}</div><div class="transaction-time">${tx.time || tx.date}</div></div></div><div class="transaction-amount ${tx.amount > 0 ? 'amount-positive' : 'amount-negative'}">${tx.amount > 0 ? '+' : ''}R${Math.abs(tx.amount).toFixed(2)}</div></div>`).join(''); }
function blockSelectedAccount() { if (!selectedAccountId) { showToast('Select an account first', 'error'); return; } const acc = accounts.find(a => a.id === selectedAccountId); if (acc.status === 'Blocked') { showToast('Already blocked', 'warning'); return; } acc.status = 'Blocked'; saveAccounts(); addTransaction(selectedAccountId, 'Account Blocked by Admin', 0); logStaffActivity('BLOCK_ACCOUNT', `Blocked account ${selectedAccountId}`, selectedAccountId); updateWalletStats(); renderAccountList(); selectAccount(selectedAccountId); showToast(`${selectedAccountId} blocked`, 'warning'); }
function unblockSelectedAccount() { if (!selectedAccountId) { showToast('Select an account first', 'error'); return; } const acc = accounts.find(a => a.id === selectedAccountId); if (acc.status === 'Active') { showToast('Already active', 'warning'); return; } acc.status = 'Active'; saveAccounts(); addTransaction(selectedAccountId, 'Account Unblocked by Admin', 0); logStaffActivity('UNBLOCK_ACCOUNT', `Unblocked account ${selectedAccountId}`, selectedAccountId); updateWalletStats(); renderAccountList(); selectAccount(selectedAccountId); showToast(`${selectedAccountId} unblocked`, 'success'); }
function quickTopUp() { if (!selectedAccountId) { showToast('Select an account first', 'error'); return; } const amount = parseFloat(document.getElementById('quickTopupAmount').value); if (isNaN(amount) || amount <= 0) { showToast('Enter valid amount', 'error'); return; } const acc = accounts.find(a => a.id === selectedAccountId); acc.balance += amount; saveAccounts(); addTransaction(selectedAccountId, `Admin Top Up: +R${amount.toFixed(2)}`, amount); logStaffActivity('TOP_UP', `Topped up ${selectedAccountId} with R${amount.toFixed(2)}`, selectedAccountId); updateWalletStats(); renderAccountList(); document.getElementById('selBalance').innerText = 'R' + acc.balance.toFixed(2); renderAccountTransactions(); showToast(`R${amount.toFixed(2)} added`, 'success'); }
function openTopUpModal() { if (!selectedAccountId) { showToast('Select an account first', 'error'); return; } document.getElementById('modalAccountId').innerText = selectedAccountId; document.getElementById('topUpModal').classList.add('active'); }
function confirmTopUp() { const amount = parseFloat(document.getElementById('modalTopupAmount').value); if (isNaN(amount) || amount <= 0) { showToast('Enter valid amount', 'error'); return; } const acc = accounts.find(a => a.id === selectedAccountId); acc.balance += amount; saveAccounts(); addTransaction(selectedAccountId, `Admin Top Up: +R${amount.toFixed(2)}`, amount); logStaffActivity('TOP_UP', `Topped up ${selectedAccountId} with R${amount.toFixed(2)}`, selectedAccountId); updateWalletStats(); renderAccountList(); document.getElementById('selBalance').innerText = 'R' + acc.balance.toFixed(2); renderAccountTransactions(); showToast(`R${amount.toFixed(2)} added`, 'success'); closeModal(); }
function updateTicketStats() { const tickets = loadTickets(); document.getElementById('totalTickets').innerText = tickets.length; document.getElementById('totalEvents').innerText = events.filter(e => e.status === 'active').length; const uniqueHolders = new Set(tickets.map(t => t.ticketId?.split('_')[0])).size; document.getElementById('totalTicketHolders').innerText = uniqueHolders; let revenue = 0; for (let event of events) { for (let type in event.ticketTypes) { revenue += (event.ticketTypes[type].sold || 0) * (event.ticketTypes[type].price || 0); } } document.getElementById('totalRevenue').innerText = 'R' + revenue.toLocaleString(); }

function renderFullEventCard() { const container = document.getElementById('fullEventCardContainer'); if (!events.length) { container.innerHTML = '<div class="empty-state" style="background:white; border-radius:28px; padding:30px;"><i class="fas fa-calendar-times" style="font-size:48px; color:#E30613;"></i><p style="margin-top:12px;">No events yet. Click "Add Event"</p></div>'; return; } const event = selectedEventId ? events.find(e => e.id === selectedEventId) : events[0]; if (!event) return; const totalSold = (event.ticketTypes.earlyBird?.sold || 0) + (event.ticketTypes.general?.sold || 0) + (event.ticketTypes.vip?.sold || 0); const totalCap = (event.ticketTypes.earlyBird?.capacity || 0) + (event.ticketTypes.general?.capacity || 0) + (event.ticketTypes.vip?.capacity || 0); const percent = totalCap ? Math.round((totalSold / totalCap) * 100) : 0; const statusClass = event.status === 'active' ? 'active' : (event.status === 'upcoming' ? 'upcoming' : 'ended'); container.innerHTML = `<div class="event-card-full"><div class="event-banner-full"><span class="event-status-badge-full ${statusClass}">${event.status === 'active' ? '🔥 LIVE' : event.status.toUpperCase()}</span></div><div class="event-content-full"><div class="event-title-full">${escapeHtml(event.name)}</div><div class="detail-item-full"><i class="fas fa-calendar-alt"></i><span>${event.date || 'TBD'}</span></div><div class="detail-item-full"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(event.location || 'Rands Cape Town')}</span></div><div class="ticket-types-full">${event.ticketTypes.earlyBird ? `<div class="ticket-row-full"><span class="ticket-label-full">🎟️ Early Bird</span><span class="ticket-price-full">R${event.ticketTypes.earlyBird.price}</span><span class="ticket-sold-full">${event.ticketTypes.earlyBird.sold} sold</span></div>` : ''}${event.ticketTypes.general ? `<div class="ticket-row-full"><span class="ticket-label-full">👥 General Admission</span><span class="ticket-price-full">R${event.ticketTypes.general.price}</span><span class="ticket-sold-full">${event.ticketTypes.general.sold} sold</span></div>` : ''}${event.ticketTypes.vip ? `<div class="ticket-row-full"><span class="ticket-label-full">👑 VIP Experience</span><span class="ticket-price-full">R${event.ticketTypes.vip.price}</span><span class="ticket-sold-full">${event.ticketTypes.vip.sold} sold</span></div>` : ''}</div><div class="stats-row-full"><div class="stat-block-full"><div class="stat-number-full">${totalSold}</div><div class="stat-label-full">Sold</div></div><div class="stat-block-full"><div class="stat-number-full">${totalCap - totalSold}</div><div class="stat-label-full">Remaining</div></div><div class="stat-block-full"><div class="stat-number-full">${percent}%</div><div class="stat-label-full">Capacity</div></div></div><div class="event-actions-full"><button class="action-btn-full view" onclick="viewEventDetails('${event.id}')"><i class="fas fa-eye"></i> View</button><button class="action-btn-full edit" onclick="openEditTicketModalById('${event.id}')"><i class="fas fa-edit"></i> Edit</button><button class="action-btn-full delete" onclick="deleteSelectedEventById('${event.id}')"><i class="fas fa-trash"></i> Delete</button><button class="action-btn-full duplicate" onclick="duplicateEvent('${event.id}')"><i class="fas fa-copy"></i> Duplicate</button></div></div></div>`; }
function viewEventDetails(id) { const ev = events.find(e => e.id === id); if (ev) alert(`🎉 ${ev.name}\nDate: ${ev.date}\nStatus: ${ev.status}\nSold: ${(ev.ticketTypes.earlyBird?.sold || 0)+(ev.ticketTypes.general?.sold || 0)+(ev.ticketTypes.vip?.sold || 0)}`); }
function duplicateEvent(id) { const original = events.find(e => e.id === id); if (!original) return; const newEvent = JSON.parse(JSON.stringify(original)); newEvent.id = 'evt_' + Date.now(); newEvent.name = original.name + " (Copy)"; if(newEvent.ticketTypes.earlyBird) newEvent.ticketTypes.earlyBird.sold = 0; if(newEvent.ticketTypes.general) newEvent.ticketTypes.general.sold = 0; if(newEvent.ticketTypes.vip) newEvent.ticketTypes.vip.sold = 0; events.push(newEvent); showToast(`Event duplicated: ${newEvent.name}`, 'success'); renderFullEventCard(); updateTicketStats(); }
function openEditTicketModalById(id) { const ev = events.find(e => e.id === id); if (ev) { selectedEventId = id; openEditTicketModal(); } }
function deleteSelectedEventById(id) { if (confirm('Delete this event permanently?')) { events = events.filter(e => e.id !== id); if (selectedEventId === id) selectedEventId = null; renderFullEventCard(); updateTicketStats(); showToast('Event deleted', 'success'); } }
function selectEvent(eventId) { selectedEventId = eventId; const ev = events.find(e => e.id === eventId); if (!ev) return; document.getElementById('selectedEventInfo').style.display = 'block'; document.getElementById('selectedEventDisplay').innerHTML = `Selected: ${ev.name}`; document.getElementById('selEventName').innerText = ev.name; document.getElementById('selEventDate').innerText = ev.date; document.getElementById('selEventLocation').innerText = ev.location || 'TBA'; renderTicketInventory(); renderEventPurchases(); renderFullEventCard(); }
function renderTicketInventory() { const container = document.getElementById('ticketInventory'); if (!selectedEventId) { container.innerHTML = '<div class="empty-state"><span>🎟️</span><p>Select an event</p></div>'; return; } const ev = events.find(e => e.id === selectedEventId); if (!ev) return; const types = [{ key: 'earlyBird', label: '🐦 Early Bird' }, { key: 'general', label: '🎟️ General' }, { key: 'vip', label: '👑 VIP' }]; container.innerHTML = types.map(t => { const data = ev.ticketTypes[t.key]; if (!data) return ''; const remaining = data.capacity - data.sold; return `<div class="transaction-item"><div class="transaction-left"><div class="transaction-icon"><i class="fas fa-ticket-alt"></i></div><div class="transaction-details"><div class="transaction-type">${t.label}</div><div class="transaction-time">Price: R${data.price} | Cap: ${data.capacity}</div></div></div><div class="transaction-amount amount-positive">Sold: ${data.sold}<br><span style="font-size:0.6rem;">Left: ${remaining}</span></div></div>`; }).join(''); }
function renderEventPurchases() { const container = document.getElementById('eventPurchases'); if (!selectedEventId) { container.innerHTML = '<div class="empty-state"><span>📭</span><p>Select an event</p></div>'; return; } const ev = events.find(e => e.id === selectedEventId); const tickets = loadTickets(); const eventTickets = tickets.filter(t => t.eventName === ev.name); if (eventTickets.length === 0) { container.innerHTML = '<div class="empty-state"><span>🎫</span><p>No tickets purchased</p></div>'; return; } container.innerHTML = eventTickets.map(t => `<div class="transaction-item"><div class="transaction-left"><div class="transaction-icon"><i class="fas fa-user"></i></div><div class="transaction-details"><div class="transaction-type">${escapeHtml(t.ticketType)}</div><div class="transaction-time">ID: ${t.ticketId?.slice(-12)}</div></div></div><div class="transaction-amount amount-positive">R${t.price?.toFixed(2) || 0}</div></div>`).join(''); }
function openAddEventModal() { document.getElementById('addEventModal').classList.add('active'); }
function closeAddEventModal() { document.getElementById('addEventModal').classList.remove('active'); }
function toggleTicketFields(type) { const fields = document.getElementById(`${type}Fields`); if(fields) { fields.classList.toggle('active'); const icon = fields.parentElement.querySelector('.toggle-icon i'); if(icon) icon.className = fields.classList.contains('active') ? 'fas fa-chevron-up' : 'fas fa-chevron-down'; } }

// CREATE EVENT - Saves ONLY to Supabase (database only)
function confirmAddEvent() {
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
    
    const ticketTypes = {};
    if(earlyBirdPrice > 0 && earlyBirdCap > 0) ticketTypes.earlyBird = { price: earlyBirdPrice, capacity: earlyBirdCap, sold: 0 };
    if(generalPrice > 0 && generalCap > 0) ticketTypes.general = { price: generalPrice, capacity: generalCap, sold: 0 };
    if(vipPrice > 0 && vipCap > 0) ticketTypes.vip = { price: vipPrice, capacity: vipCap, sold: 0 };
    
    if(Object.keys(ticketTypes).length === 0) { showToast('Add at least one ticket type with price and capacity', 'error'); return; }
    
    // Show saving message
    showToast('Saving event to database...', 'success');
    
    // Save ONLY to Supabase (no localStorage for events anymore)
    window.supabaseClient.from('events').insert([{ 
        name: name, 
        location: location, 
        start_time: date, 
        description: `Tickets: EarlyBird R${earlyBirdPrice}/${earlyBirdCap} | General R${generalPrice}/${generalCap} | VIP R${vipPrice}/${vipCap}`
    }]).then(async result => {
        if (result.error) {
            console.error('❌ Supabase error:', result.error);
            showToast('Database error: ' + result.error.message, 'error');
        } else {
            console.log('✅ Saved to Supabase:', result.data);
            showToast(`Event "${name}" saved to database!`, 'success');
            // Refresh events from Supabase
            const freshEvents = await loadEventsFromSupabase();
            events = freshEvents;
            renderFullEventCard();
            updateTicketStats();
            if (events.length > 0 && !selectedEventId) {
                selectedEventId = events[0].id;
                selectEvent(selectedEventId);
            }
        }
    }).catch(err => {
        console.error('❌ Network error:', err);
        showToast('Network error - check console', 'error');
    });
    
    // Close modal and clear form
    closeAddEventModal(); 
    
    // Clear form
    document.getElementById('newEventName').value = ''; 
    document.getElementById('newEventDate').value = ''; 
    document.getElementById('newEventLocation').value = 'Rands Cape Town';
    ['newEarlyBirdPrice','newEarlyBirdCapacity','newGeneralPrice','newGeneralCapacity','newVipPrice','newVipCapacity'].forEach(id => { 
        if(document.getElementById(id)) document.getElementById(id).value = ''; 
    });
    ['earlyBirdFields','generalFields','vipFields'].forEach(id => { 
        const el = document.getElementById(id); 
        if(el && el.classList.contains('active')) el.classList.remove('active'); 
    });
}

function deleteSelectedEvent() { if (!selectedEventId) { showToast('Select an event first', 'error'); return; } if (confirm('Delete selected event?')) { events = events.filter(e => e.id !== selectedEventId); selectedEventId = null; document.getElementById('selectedEventInfo').style.display = 'none'; document.getElementById('selectedEventDisplay').innerHTML = 'No event selected'; renderFullEventCard(); updateTicketStats(); showToast('Event deleted', 'success'); } }
function openEditTicketModal() { if (!selectedEventId) { showToast('Select an event first', 'error'); return; } const ev = events.find(e => e.id === selectedEventId); document.getElementById('editEventNameDisplay').innerHTML = ev.name; document.getElementById('editEarlyBirdPrice').value = ev.ticketTypes.earlyBird?.price || ''; document.getElementById('editEarlyBirdCapacity').value = ev.ticketTypes.earlyBird?.capacity || ''; document.getElementById('editGeneralPrice').value = ev.ticketTypes.general?.price || ''; document.getElementById('editGeneralCapacity').value = ev.ticketTypes.general?.capacity || ''; document.getElementById('editVipPrice').value = ev.ticketTypes.vip?.price || ''; document.getElementById('editVipCapacity').value = ev.ticketTypes.vip?.capacity || ''; document.getElementById('editTicketModal').classList.add('active'); }
function closeEditTicketModal() { document.getElementById('editTicketModal').classList.remove('active'); }
function confirmEditTickets() { if (!selectedEventId) return; const ev = events.find(e => e.id === selectedEventId); const ebPrice = parseFloat(document.getElementById('editEarlyBirdPrice').value); const ebCap = parseInt(document.getElementById('editEarlyBirdCapacity').value); const genPrice = parseFloat(document.getElementById('editGeneralPrice').value); const genCap = parseInt(document.getElementById('editGeneralCapacity').value); const vipPrice = parseFloat(document.getElementById('editVipPrice').value); const vipCap = parseInt(document.getElementById('editVipCapacity').value); if(ebPrice && ebCap) ev.ticketTypes.earlyBird = { price: ebPrice, capacity: ebCap, sold: ev.ticketTypes.earlyBird?.sold || 0 }; if(genPrice && genCap) ev.ticketTypes.general = { price: genPrice, capacity: genCap, sold: ev.ticketTypes.general?.sold || 0 }; if(vipPrice && vipCap) ev.ticketTypes.vip = { price: vipPrice, capacity: vipCap, sold: ev.ticketTypes.vip?.sold || 0 }; renderTicketInventory(); updateTicketStats(); renderFullEventCard(); showToast('Ticket inventory updated', 'success'); closeEditTicketModal(); }
function renderGlobalActivity() { const container = document.getElementById('globalActivity'); let allTx = []; for (let accId in transactionsMap) { const txs = transactionsMap[accId]; txs.forEach(tx => { allTx.push({ ...tx, accountId: accId, accountName: accounts.find(a => a.id === accId)?.name || accId }); }); } allTx.sort((a,b) => new Date(b.date) - new Date(a.date)); const recent = allTx.slice(0,12); if (recent.length === 0) { container.innerHTML = '<div class="empty-state"><span>📭</span><p>No recent activity</p></div>'; return; } container.innerHTML = recent.map(tx => `<div class="transaction-item"><div class="transaction-left"><div class="transaction-icon"><i class="fas ${tx.amount > 0 ? 'fa-arrow-up' : 'fa-arrow-down'}"></i></div><div class="transaction-details"><div class="transaction-type">${escapeHtml(tx.desc)}</div><div class="transaction-time">${tx.accountName}</div></div></div><div class="transaction-amount ${tx.amount > 0 ? 'amount-positive' : 'amount-negative'}">${tx.amount > 0 ? '+' : ''}R${Math.abs(tx.amount).toFixed(2)}</div></div>`).join(''); }
function filterAccounts() { renderAccountList(); }
function setQuickAmount(amt) { document.getElementById('quickTopupAmount').value = amt; }
function setModalAmount(amt) { document.getElementById('modalTopupAmount').value = amt; }
function closeModal() { document.getElementById('topUpModal').classList.remove('active'); }
function refreshData() { loadAllData(); updateWalletStats(); renderAccountList(); renderGlobalActivity(); if (selectedAccountId) selectAccount(selectedAccountId); showToast('Refreshed', 'success'); }
async function refreshTickets() { 
    const freshEvents = await loadEventsFromSupabase();
    events = freshEvents;
    updateTicketStats(); 
    renderFullEventCard(); 
    if (events.length > 0 && !selectedEventId) {
        selectedEventId = events[0].id;
        selectEvent(selectedEventId);
    } else if (selectedEventId && events.find(e => e.id === selectedEventId)) {
        selectEvent(selectedEventId);
    } else if (events.length > 0) {
        selectedEventId = events[0].id;
        selectEvent(selectedEventId);
    }
    showToast('Events refreshed from database', 'success'); 
}
function switchTab(tab) { document.getElementById('walletTab').style.display = tab === 'wallet' ? 'block' : 'none'; document.getElementById('ticketsTab').style.display = tab === 'tickets' ? 'block' : 'none'; document.getElementById('activityTab').style.display = tab === 'activity' ? 'block' : 'none'; const btns = document.querySelectorAll('.tab-btn'); btns.forEach((btn) => { const btnTab = btn.innerText.toLowerCase().includes('passport') ? 'wallet' : btn.innerText.toLowerCase().includes('ticket') ? 'tickets' : 'activity'; btn.classList.toggle('active', btnTab === tab); }); if (tab === 'tickets') { updateTicketStats(); renderFullEventCard(); if (events.length > 0 && !selectedEventId) selectEvent(events[0].id); } else if (tab === 'wallet') { updateWalletStats(); renderAccountList(); updateRefundStats(); renderRefundRequests(); } else if (tab === 'activity') { updateActivityStats(); renderActivityLog(); } }
function showToast(message, type) { const toast = document.getElementById('toast'); document.getElementById('toastIcon').innerText = type === 'success' ? '✅' : (type === 'error' ? '❌' : '⚠️'); document.getElementById('toastMessage').innerText = message; toast.className = `toast ${type === 'success' ? 'success' : (type === 'error' ? 'error' : 'warning')} show`; setTimeout(() => toast.classList.remove('show'), 2500); }
function escapeHtml(text) { if (!text) return ''; const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

async function init() { 
    loadAllData(); 
    const supabaseEvents = await loadEventsFromSupabase();
    events = supabaseEvents;
    updateWalletStats(); 
    renderAccountList(); 
    renderFullEventCard(); 
    renderGlobalActivity(); 
    updateRefundStats(); 
    renderRefundRequests(); 
    updateActivityStats(); 
    renderActivityLog(); 
    if (accounts.find(a => a.id === YOUR_PHONE)) selectAccount(YOUR_PHONE);
    if (events.length > 0 && !selectedEventId) {
        selectedEventId = events[0].id;
        selectEvent(selectedEventId);
    }
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
    console.log('✅ Ready - Events loaded from Supabase database only');
}
init();
window.toggleTicketFields = toggleTicketFields;
window.confirmAddEvent = confirmAddEvent;