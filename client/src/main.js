import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import App from './App.vue';
import Home from './views/Home.vue';
import Import from './views/Import.vue';
import Books from './views/Books.vue';
import Quotes from './views/Quotes.vue';
import Settings from './views/Settings.vue';

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'brown',
    themes: {
      brown: {
        dark: false,
        colors: {
          background: '#F2E8DC',
          surface: '#FFFAF4',
          primary: '#6D4C41',
          secondary: '#A1887F',
          error: '#B3402A',
          success: '#6B7F3A',
        },
      },
    },
  },
});

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/import', component: Import },
    { path: '/books', component: Books },
    { path: '/quotes', component: Quotes },
    { path: '/settings', component: Settings },
  ],
});

createApp(App).use(router).use(vuetify).mount('#app');
