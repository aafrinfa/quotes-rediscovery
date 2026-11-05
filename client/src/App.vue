<template>
  <v-app>
    <v-app-bar color="primary" flat>
      <v-app-bar-title class="serif">Quote Rediscovery</v-app-bar-title>
      <template #extension>
        <v-tabs align-tabs="center" show-arrows>
          <v-tab to="/" exact prepend-icon="mdi-format-quote-open">Today</v-tab>
          <v-tab to="/import" prepend-icon="mdi-import">Import</v-tab>
          <v-tab to="/books" prepend-icon="mdi-book-open-variant">Books</v-tab>
          <v-tab to="/quotes" prepend-icon="mdi-format-list-bulleted">Quotes</v-tab>
          <v-tab to="/settings" prepend-icon="mdi-bell-outline">Settings</v-tab>
        </v-tabs>
      </template>
    </v-app-bar>
    <v-main>
      <v-container style="max-width: 820px">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<style>
.serif {
  font-family: Georgia, 'Iowan Old Style', 'Palatino Linotype', serif;
}
</style>
