"use client";

import { create } from "zustand";
import type { Subscription, Category } from "@/lib/types";

interface SubscriptionState {
  subscriptions: Subscription[];
  categories: Category[];
  isLoading: boolean;
  setSubscriptions: (subscriptions: Subscription[]) => void;
  setCategories: (categories: Category[]) => void;
  setLoading: (loading: boolean) => void;
  updateSubscription: (channelId: string, updates: Partial<Subscription>) => void;
  moveSubscription: (channelId: string, newCategory: string) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  subscriptions: [],
  categories: [],
  isLoading: true,
  setSubscriptions: (subscriptions) => set({ subscriptions }),
  setCategories: (categories) => set({ categories }),
  setLoading: (isLoading) => set({ isLoading }),
  updateSubscription: (channelId, updates) =>
    set((state) => ({
      subscriptions: state.subscriptions.map((sub) =>
        sub.channel_id === channelId ? { ...sub, ...updates } : sub
      ),
    })),
  moveSubscription: (channelId, newCategory) =>
    set((state) => ({
      subscriptions: state.subscriptions.map((sub) =>
        sub.channel_id === channelId
          ? { ...sub, primary_category: newCategory, user_overridden: true }
          : sub
      ),
    })),
}));
