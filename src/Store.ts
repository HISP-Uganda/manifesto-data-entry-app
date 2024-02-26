import { changeApproval } from "./utils";
import { createApi, createDomain } from "effector";
import { Commitment, CurrentUser } from "./interfaces";

const domain = createDomain();

export const $completions = domain.createStore<Record<string, boolean>>({});
export const $commitments = domain.createStore<Commitment[]>([]);
export const $currentUser = domain.createStore<CurrentUser>({
    username: "",
    name: "",
    id: "",
    email: "",
});
export const $approvals = domain.createStore<
    Record<string, Record<string, any>>
>({});

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

export const approvalsApi = createApi($approvals, {
    change: (_, data: Record<string, Record<string, any>>) => {
        return data;
    },
    set: (
        state,
        data: {
            mda: string;
            period: string;
            approved: boolean;
            currentUser: CurrentUser;
        }
    ) => {
        return changeApproval(state, data);
    },
});

export const currentUserApi = createApi($currentUser, {
    set: (_, user: CurrentUser) => user,
});
