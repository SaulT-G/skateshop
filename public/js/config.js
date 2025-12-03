// ==================== CONFIGURACIÓN Y CONSTANTES ====================

// Límites para stock y precio
const MAX_STOCK = 10000;
const MAX_PRICE = 99999.99;

// Configuración de Supabase - IMPORTANTE
const SUPABASE_CONFIG = {
    url: 'https://iwukmgzlbocbrsaaoptn.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dWttZ3psYm9jYnJzYWFvcHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2OTE5OTMsImV4cCI6MjA4MDI2Nzk5M30.KS12C_A9NWc6frXurFbNSosOXWKuPkoJXe-zYq6Q_9k'
};

// Inicializar cliente de Supabase
let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    console.log('✅ Cliente Supabase inicializado');
}

// API Base URL - Se detecta automáticamente el entorno
const API_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    return 'https://tu-backend.railway.app/api'; // ⚠️ CAMBIAR cuando despliegues
})();

// Función helper para obtener la URL base (sin /api)
function getBaseUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return API_URL.replace('/api', '');
}
