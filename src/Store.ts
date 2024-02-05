import { createApi, createDomain } from "effector";

const domain = createDomain();

export const $completions = domain.createStore<Record<string, boolean>>({});

export const completionsApi = createApi($completions, {
    update: (state, completions: Record<string, boolean>) => {
        return { ...state, ...completions };
    },
});
