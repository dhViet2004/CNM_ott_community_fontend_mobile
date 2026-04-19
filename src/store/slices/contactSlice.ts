import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Contact {
  id: string;
  name: string;
  avatar?: string;
  phone?: string;
  status?: string;
  isOnline?: boolean;
  lastSeen?: string;
  isBlocked?: boolean;
  isFavorite?: boolean;
  nickname?: string;
  // Fields from PendingRequest / FriendItem
  userId?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string | null;
}

interface ContactState {
  contacts: Contact[];
  favorites: Contact[];
  blocked: Contact[];
  pendingRequests: Contact[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
}

const initialState: ContactState = {
  contacts: [],
  favorites: [],
  blocked: [],
  pendingRequests: [],
  isLoading: false,
  error: null,
  searchQuery: '',
};

const contactSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    setContacts(state, action: PayloadAction<Contact[]>) {
      state.contacts = action.payload;
      state.favorites = action.payload.filter((c) => c.isFavorite);
    },
    addContact(state, action: PayloadAction<Contact>) {
      state.contacts.unshift(action.payload);
    },
    removeContact(state, action: PayloadAction<string>) {
      state.contacts = state.contacts.filter((c) => c.id !== action.payload);
    },
    updateContact(
      state,
      action: PayloadAction<{ id: string; updates: Partial<Contact> }>
    ) {
      const index = state.contacts.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.contacts[index] = { ...state.contacts[index], ...action.payload.updates };
      }
    },
    toggleFavorite(state, action: PayloadAction<string>) {
      const contact = state.contacts.find((c) => c.id === action.payload);
      if (contact) {
        contact.isFavorite = !contact.isFavorite;
        if (contact.isFavorite) {
          state.favorites.push(contact);
        } else {
          state.favorites = state.favorites.filter((c) => c.id !== action.payload);
        }
      }
    },
    blockContact(state, action: PayloadAction<string>) {
      const contact = state.contacts.find((c) => c.id === action.payload);
      if (contact) {
        contact.isBlocked = true;
        state.blocked.push(contact);
      }
    },
    unblockContact(state, action: PayloadAction<string>) {
      state.contacts = state.contacts.map((c) =>
        c.id === action.payload ? { ...c, isBlocked: false } : c
      );
      state.blocked = state.blocked.filter((c) => c.id !== action.payload);
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setContactSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setPendingRequests(state, action: PayloadAction<Contact[]>) {
      state.pendingRequests = action.payload;
    },
    setRawPendingRequests(state, action: PayloadAction<Array<{ userId: string; username: string; display_name: string; avatar_url: string | null }>>) {
      state.pendingRequests = action.payload.map((p) => ({
        id: p.userId,
        name: p.display_name,
        avatar: p.avatar_url ?? undefined,
        userId: p.userId,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
      }));
    },
    addPendingRequest(state, action: PayloadAction<{ userId: string; username: string; display_name: string; avatar_url: string | null }>) {
      const exists = state.pendingRequests.find((c) => c.id === action.payload.userId);
      if (!exists) {
        state.pendingRequests.unshift({
          id: action.payload.userId,
          name: action.payload.display_name,
          avatar: action.payload.avatar_url ?? undefined,
        });
      }
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
});

export const {
  setContacts,
  addContact,
  removeContact,
  updateContact,
  toggleFavorite,
  blockContact,
  unblockContact,
  setSearchQuery,
  setContactSearchQuery,
  setPendingRequests,
  setRawPendingRequests,
  addPendingRequest,
  setLoading,
  clearError,
} = contactSlice.actions;

export default contactSlice.reducer;
