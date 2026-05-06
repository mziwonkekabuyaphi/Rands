import { supabase } from '../../config/supabase.js';

// ===================== STATE =====================
let wallets = [];
let events = [];

let currentUser = null;
let selectedAccountId = null;
let selectedEventId = null;

// ===================== ADMIN FALLBACK (optional) =====================
const YOUR_BALANCE = 12580.50;

// ===================== GET CURRENT USER =====================
async function getUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    console.error('Auth error:', error);
    return null;
  }

  currentUser = data.user;
  return currentUser;
}

// ===================== WALLET =====================
async function loadWallets() {
  const user = await getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    console.error('Wallet load error:', error);
    wallets = [];
    return;
  }

  wallets = data || [];

  // auto-create wallet if missing
  if (wallets.length === 0) {
    const { data: created, error: createErr } = await supabase
      .from('wallets')
      .insert([{
        user_id: user.id,
        balance: YOUR_BALANCE
      }])
      .select();

    if (!createErr && created?.length) {
      wallets.push(created[0]);
    }
  }
}

// ===================== WALLET TX =====================
async function addWalletTransaction(walletId, type, amount, description) {
  await supabase.from('wallet_transactions').insert([{
    wallet_id: walletId,
    type,
    amount,
    description
  }]);
}

// ===================== EVENTS =====================
async function loadEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Events load error:', error);
    events = [];
    return;
  }

  events = (data || []).map(e => ({
    id: e.id,
    name: e.name,
    date: e.start_time
      ? new Date(e.start_time).toISOString().split('T')[0]
      : '',
    location: e.location || 'Rands Cape Town',
    status: 'active'
  }));
}

// ===================== TOP UP =====================
async function quickTopUp() {
  if (!selectedAccountId) return showToast('Select account first', 'error');

  const amount = Number(document.getElementById('quickTopupAmount')?.value);
  if (!amount || amount <= 0) return showToast('Invalid amount', 'error');

  const wallet = wallets.find(w => w.id === selectedAccountId);
  if (!wallet) return showToast('Wallet not found', 'error');

  const newBalance = Number(wallet.balance || 0) + amount;

  const { error } = await supabase
    .from('wallets')
    .update({ balance: newBalance })
    .eq('id', wallet.id);

  if (error) {
    console.error(error);
    return showToast('Top up failed', 'error');
  }

  await addWalletTransaction(wallet.id, 'credit', amount, 'Admin Top Up');

  await refreshWallet();
  showToast(`R${amount} added`, 'success');
}

// ===================== REFRESH =====================
async function refreshWallet() {
  await loadWallets();

  updateWalletStats?.();
  renderAccountList?.();

  if (selectedAccountId) selectAccount(selectedAccountId);
}

// ===================== SELECT ACCOUNT =====================
function selectAccount(id) {
  selectedAccountId = id;

  const wallet = wallets.find(w => w.id === id);
  if (!wallet) return;

  const panel = document.getElementById('selectedAccountInfo');
  if (panel) panel.style.display = 'block';

  document.getElementById('selAccountId').innerText = wallet.id;
  document.getElementById('selBalance').innerText =
    `R${Number(wallet.balance || 0).toFixed(2)}`;
}

// ===================== SELECT EVENT =====================
function selectEvent(id) {
  selectedEventId = id;

  const ev = events.find(e => e.id === id);
  if (!ev) return;

  const panel = document.getElementById('selectedEventInfo');
  if (panel) panel.style.display = 'block';

  document.getElementById('selEventName').innerText = ev.name;
  document.getElementById('selEventDate').innerText = ev.date;
  document.getElementById('selEventLocation').innerText = ev.location;

  renderFullEventCard?.();
}

// ===================== INIT =====================
async function init() {
  const user = await getUser();
  if (!user) {
    console.warn('❌ No authenticated user');
    return;
  }

  await loadWallets();
  await loadEvents();

  updateWalletStats?.();
  renderAccountList?.();
  renderFullEventCard?.();

  if (events.length > 0) {
    selectedEventId = events[0].id;
    selectEvent(selectedEventId);
  }

  console.log('✅ WALLET CONNECTED TO SUPABASE AUTH');
}

// ===================== EXPORTS =====================
window.quickTopUp = quickTopUp;
window.selectAccount = selectAccount;
window.selectEvent = selectEvent;

// ===================== START =====================
init();
