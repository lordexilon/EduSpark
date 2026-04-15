export const CONFIG = {
    BASE_URL: 'http://localhost:5173', // Cambiar a la URL de producción o staging
    SUPABASE_URL: 'https://mckfscukxcqwntpjagar.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.-5HFEuphwYhfa8HBW3FddQfu5b-JOCb6FLElKFwezBg',
    AUTH_ENDPOINT: '/auth/v1/token?grant_type=password',
    TEST_USER: {
        email: 'test_user@eduspark.ai',
        password: 'password_de_prueba'
    },
    SCENARIOS: {
        SMOKE: { VUS: 50, DURATION: '1m' },
        LIGHT: { VUS: 500, DURATION: '3m' },
        MEDIUM: { VUS: 1000, DURATION: '5m' },
        STRESS: { VUS: 10000, DURATION: '10m' }
    }
};
