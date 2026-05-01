/**
 * Event Manager - Supabase CRUD Operations
 * Rands Event Management System
 * 
 * This file provides event management functions that can be used across the application.
 * The HTML page (event-manager.html) uses its own inline script with ES modules.
 * This file is for use with traditional script tags and the global Supabase client.
 */

const SUPABASE_URL = 'https://fqbcidcezfprranfxhyj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxYmNpZGNlemZwcnJhbmZ4aHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MjY0ODgsImV4cCI6MjA5MzIwMjQ4OH0.eGCEE-lA8yLGjU1nFXv_A1RjbWvRbb5Mfm8FMzVRgHI';

// Initialize Supabase client if the library is loaded
let supabaseClient = null;

function initSupabase() {
    if (window.supabase && !supabaseClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase initialized for Event Manager');
    }
    return supabaseClient;
}

// Get the Supabase client
function getSupabase() {
    if (!supabaseClient) {
        initSupabase();
    }
    return supabaseClient;
}

/**
 * Fetch all events from Supabase
 * @returns {Promise<{data: Array, error: Object}>}
 */
async function fetchAllEvents() {
    const client = getSupabase();
    if (!client) {
        return { data: null, error: { message: 'Supabase not initialized' } };
    }

    try {
        const { data, error } = await client
            .from('events')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching events:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Exception fetching events:', err);
        return { data: null, error: { message: err.message } };
    }
}

/**
 * Fetch a single event by ID
 * @param {string} eventId - The UUID of the event
 * @returns {Promise<{data: Object, error: Object}>}
 */
async function fetchEventById(eventId) {
    const client = getSupabase();
    if (!client) {
        return { data: null, error: { message: 'Supabase not initialized' } };
    }

    try {
        const { data, error } = await client
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (error) {
            console.error('Error fetching event:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Exception fetching event:', err);
        return { data: null, error: { message: err.message } };
    }
}

/**
 * Create a new event
 * @param {Object} eventData - Event data object
 * @param {string} eventData.name - Event name (required)
 * @param {string} eventData.location - Event location
 * @param {string} eventData.start_time - Event start time (ISO string or datetime-local format)
 * @param {string} eventData.description - Event description
 * @returns {Promise<{data: Object, error: Object}>}
 */
async function createEvent(eventData) {
    const client = getSupabase();
    if (!client) {
        return { data: null, error: { message: 'Supabase not initialized' } };
    }

    if (!eventData.name || eventData.name.trim() === '') {
        return { data: null, error: { message: 'Event name is required' } };
    }

    try {
        const { data, error } = await client
            .from('events')
            .insert([{
                name: eventData.name.trim(),
                location: eventData.location?.trim() || null,
                start_time: eventData.start_time || null,
                description: eventData.description?.trim() || null
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating event:', error);
            return { data: null, error };
        }

        console.log('Event created:', data);
        return { data, error: null };
    } catch (err) {
        console.error('Exception creating event:', err);
        return { data: null, error: { message: err.message } };
    }
}

/**
 * Update an existing event
 * @param {string} eventId - The UUID of the event to update
 * @param {Object} eventData - Updated event data
 * @returns {Promise<{data: Object, error: Object}>}
 */
async function updateEvent(eventId, eventData) {
    const client = getSupabase();
    if (!client) {
        return { data: null, error: { message: 'Supabase not initialized' } };
    }

    if (!eventId) {
        return { data: null, error: { message: 'Event ID is required' } };
    }

    try {
        const updateData = {};
        
        if (eventData.name !== undefined) {
            updateData.name = eventData.name.trim();
        }
        if (eventData.location !== undefined) {
            updateData.location = eventData.location?.trim() || null;
        }
        if (eventData.start_time !== undefined) {
            updateData.start_time = eventData.start_time || null;
        }
        if (eventData.description !== undefined) {
            updateData.description = eventData.description?.trim() || null;
        }

        const { data, error } = await client
            .from('events')
            .update(updateData)
            .eq('id', eventId)
            .select()
            .single();

        if (error) {
            console.error('Error updating event:', error);
            return { data: null, error };
        }

        console.log('Event updated:', data);
        return { data, error: null };
    } catch (err) {
        console.error('Exception updating event:', err);
        return { data: null, error: { message: err.message } };
    }
}

/**
 * Delete an event
 * @param {string} eventId - The UUID of the event to delete
 * @returns {Promise<{success: boolean, error: Object}>}
 */
async function deleteEvent(eventId) {
    const client = getSupabase();
    if (!client) {
        return { success: false, error: { message: 'Supabase not initialized' } };
    }

    if (!eventId) {
        return { success: false, error: { message: 'Event ID is required' } };
    }

    try {
        const { error } = await client
            .from('events')
            .delete()
            .eq('id', eventId);

        if (error) {
            console.error('Error deleting event:', error);
            return { success: false, error };
        }

        console.log('Event deleted:', eventId);
        return { success: true, error: null };
    } catch (err) {
        console.error('Exception deleting event:', err);
        return { success: false, error: { message: err.message } };
    }
}

/**
 * Search events by name, location, or description
 * @param {string} searchTerm - The search term
 * @returns {Promise<{data: Array, error: Object}>}
 */
async function searchEvents(searchTerm) {
    const client = getSupabase();
    if (!client) {
        return { data: null, error: { message: 'Supabase not initialized' } };
    }

    if (!searchTerm || searchTerm.trim() === '') {
        return fetchAllEvents();
    }

    try {
        const term = searchTerm.trim().toLowerCase();
        
        const { data, error } = await client
            .from('events')
            .select('*')
            .or(`name.ilike.%${term}%,location.ilike.%${term}%,description.ilike.%${term}%`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error searching events:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Exception searching events:', err);
        return { data: null, error: { message: err.message } };
    }
}

/**
 * Get upcoming events (events with start_time in the future)
 * @returns {Promise<{data: Array, error: Object}>}
 */
async function getUpcomingEvents() {
    const client = getSupabase();
    if (!client) {
        return { data: null, error: { message: 'Supabase not initialized' } };
    }

    try {
        const now = new Date().toISOString();
        
        const { data, error } = await client
            .from('events')
            .select('*')
            .gte('start_time', now)
            .order('start_time', { ascending: true });

        if (error) {
            console.error('Error fetching upcoming events:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Exception fetching upcoming events:', err);
        return { data: null, error: { message: err.message } };
    }
}

/**
 * Get past events (events with start_time in the past)
 * @returns {Promise<{data: Array, error: Object}>}
 */
async function getPastEvents() {
    const client = getSupabase();
    if (!client) {
        return { data: null, error: { message: 'Supabase not initialized' } };
    }

    try {
        const now = new Date().toISOString();
        
        const { data, error } = await client
            .from('events')
            .select('*')
            .lt('start_time', now)
            .order('start_time', { ascending: false });

        if (error) {
            console.error('Error fetching past events:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Exception fetching past events:', err);
        return { data: null, error: { message: err.message } };
    }
}

// Utility function to format event date for display
function formatEventDate(dateString) {
    if (!dateString) return 'Not set';
    try {
        return new Date(dateString).toLocaleString();
    } catch {
        return dateString;
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Toast notification helper
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = 'toast show ' + type;
        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Export functions for use in other files
window.EventManager = {
    init: initSupabase,
    getClient: getSupabase,
    fetchAll: fetchAllEvents,
    fetchById: fetchEventById,
    create: createEvent,
    update: updateEvent,
    delete: deleteEvent,
    search: searchEvents,
    getUpcoming: getUpcomingEvents,
    getPast: getPastEvents,
    formatDate: formatEventDate,
    escapeHtml: escapeHtml,
    showToast: showToast
};

// Auto-initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabase);
} else {
    initSupabase();
}

console.log('Event Manager module loaded');
