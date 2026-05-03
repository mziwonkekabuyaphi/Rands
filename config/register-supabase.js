// register-supabase.js - Add this to your register.html
import { supabase } from '/config/supabase.js';

// Wait for page to load
document.addEventListener('DOMContentLoaded', () => {
  // Find the existing register button
  const registerBtn = document.getElementById('s3Cta');
  if (!registerBtn) return;
  
  // Store reference to original click handler
  const originalClick = registerBtn.onclick;
  
  // Replace with Supabase version
  registerBtn.onclick = null;
  registerBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    // Get form data from existing state (if exposed globally)
    const getState = () => {
      return window.state || {
        passType: document.querySelector('.acc-card.selected')?.getAttribute('data-type') || 'general',
        firstName: document.getElementById('firstName')?.value.trim() || '',
        lastName: document.getElementById('lastName')?.value.trim() || '',
        email: document.getElementById('email')?.value.trim() || '',
        phone: document.getElementById('phone')?.value.trim() || '',
        pin: document.getElementById('pin')?.value.trim() || '',
      };
    };
    
    const userState = getState();
    
    const btn = registerBtn;
    const originalText = btn.querySelector('span')?.textContent || 'Start Vibing Now';
    btn.disabled = true;
    if (btn.querySelector('span')) btn.querySelector('span').textContent = 'CREATING...';
    
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: userState.email,
        password: userState.pin,
        options: {
          data: {
            first_name: userState.firstName,
            last_name: userState.lastName,
            phone: userState.phone,
            account_type: userState.passType,
          }
        }
      });
      
      if (signUpError) throw signUpError;
      
      await supabase.from('profiles').insert({
        id: authData.user.id,
        role: 'customer',
        phone: userState.phone,
        account_type: userState.passType,
        created_at: new Date().toISOString(),
      });
      
      // Continue to success screen (your original flow)
      if (typeof goToStep === 'function') {
        const isVip = userState.passType === 'vip';
        const successIcon = document.getElementById('successIcon');
        const successSub = document.getElementById('successSub');
        const successPills = document.getElementById('successPills');
        
        if (successIcon) successIcon.innerHTML = isVip ? '🔥' : '🎟️';
        if (successSub) successSub.innerHTML = `Welcome aboard, <strong>${userState.firstName}</strong>! Your ${isVip ? 'VIP Xperience' : 'General Account'} is ready.`;
        if (successPills) {
          successPills.innerHTML = isVip
            ? `<div class="success-pill"><div class="success-pill-dot"></div>Skip the queue</div><div class="success-pill"><div class="success-pill-dot"></div>Exclusive events</div><div class="success-pill"><div class="success-pill-dot"></div>Red metal card</div>`
            : `<div class="success-pill"><div class="success-pill-dot"></div>Browse events</div><div class="success-pill"><div class="success-pill-dot"></div>Buy tickets</div><div class="success-pill"><div class="success-pill-dot"></div>Digital wallet</div>`;
        }
        goToStep(4);
      }
      
    } catch (err) {
      alert(err.message || 'Registration failed. Please try again.');
      btn.disabled = false;
      if (btn.querySelector('span')) btn.querySelector('span').textContent = originalText;
    }
  });
});