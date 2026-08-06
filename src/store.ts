import { configureStore, createSlice } from "@reduxjs/toolkit";
import { DEFAULT_SETTINGS, PluginManagerSettings } from "./types";

const settingsSlice = createSlice({
	name: "settings",
	initialState: DEFAULT_SETTINGS,
	reducers: {
		updataSettings: (state, action) => {
			return { ...state, ...action.payload };
		},
		updataPluginManager: (state, action) => {
			state.pluginManager = action.payload;
		},
	},
});

export const store = configureStore({
	reducer: {
		settings: settingsSlice.reducer,
	},
});

export type RootState = ReturnType<typeof store.getState>;
export const {
	updataSettings,
	updataPluginManager,
} = settingsSlice.actions;
