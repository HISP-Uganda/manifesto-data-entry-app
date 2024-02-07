import { createApi, createDomain } from "effector";
import { Commitment } from "./interfaces";

const domain = createDomain();

export const $completions = domain.createStore<Record<string, boolean>>({});
export const $commitments = domain.createStore<Commitment[]>([]);

export const completionsApi = createApi($completions, {
    update: (state, completions: Record<string, boolean>) => {
        return { ...state, ...completions };
    },
});
export const commitmentApi = createApi($commitments, {
    set: (_, commitments: Commitment[]) => {
        return commitments;
    },
});
