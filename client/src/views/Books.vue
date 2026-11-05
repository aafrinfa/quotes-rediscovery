<template>
  <div>
    <h2 class="text-h6 mb-4">Your books</h2>
    <v-alert v-if="error" type="error" :text="error" class="mb-4" />
    <div v-if="!loading && !books.length" class="text-center pa-10">
      <p class="mb-4">No books yet</p>
      <v-btn color="primary" to="/import">Import quotes</v-btn>
    </div>
    <v-list v-else lines="two" rounded="lg">
      <v-list-item
        v-for="b in books"
        :key="b._id"
        :title="b.title"
        :subtitle="`${b.author || 'Unknown author'}: ${b.count} ${b.count === 1 ? 'quote' : 'quotes'}`"
        :to="{ path: '/quotes', query: { book: b._id } }"
      >
        <template #append>
          <v-btn icon="mdi-delete-outline" variant="text" aria-label="Delete book" @click.prevent="deleting = b" />
        </template>
      </v-list-item>
    </v-list>

    <v-dialog :model-value="!!deleting" max-width="420" @update:model-value="deleting = null">
      <v-card v-if="deleting" title="Delete book?">
        <v-card-text>
          "{{ deleting.title }}" and its {{ deleting.count }} quotes will be deleted.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleting = null">Cancel</v-btn>
          <v-btn color="error" @click="remove">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api.js';

const books = ref([]);
const loading = ref(true);
const error = ref('');
const deleting = ref(null);

async function load() {
  try {
    books.value = await api.get('/books');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function remove() {
  try {
    await api.del('/books/' + deleting.value._id);
    deleting.value = null;
    await load();
  } catch (e) {
    error.value = e.message;
    deleting.value = null;
  }
}

onMounted(load);
</script>
