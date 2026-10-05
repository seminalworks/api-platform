/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useSyncExternalStore } from 'react';

/**
 * Vision prototype only. Browser-local state for the demo: which wizard
 * variant to show, per-step scenario overrides, and the activation record the
 * setup guide reads. Nothing here reaches the backend.
 */

/** `real` talks to the backend; the others stage that outcome without it. */
export type Scenario = 'real' | 'success' | 'failure';

export type WizardVariant = 'takeover' | 'modal';

export type ActivationRecord = {
  projectId?: string;
  apiId?: string;
  gatewayId?: string;
  firstCallConfirmed?: boolean;
  guideDismissed?: boolean;
};

export type DemoState = {
  panelOpen: boolean;
  wizardVariant: WizardVariant;
  scenarios: { gateway: Scenario; deploy: Scenario; firstCall: Scenario };
  activation: ActivationRecord;
  /** What a Docker gateway on this machine dials to reach the control plane. */
  controlPlaneHost: string;
  /** Where a gateway started on this machine serves traffic. */
  localGatewayUrl: string;
  /** Only meaningful with the classic IA, where steps span many pages. */
  floatingGuide: boolean;
  /** Open the standalone Quick Start on an empty org's first visit. */
  quickStartOnFirstVisit: boolean;
  quickStartSeen?: boolean;
};

const STORAGE_KEY = 'vision.demo.v1';

const DEFAULT_STATE: DemoState = {
  panelOpen: false,
  wizardVariant: 'modal',
  scenarios: { gateway: 'real', deploy: 'real', firstCall: 'real' },
  activation: {},
  controlPlaneHost: 'host.docker.internal:39243',
  localGatewayUrl: 'https://localhost:38443',
  floatingGuide: false,
  quickStartOnFirstVisit: true,
};

const read = (): DemoState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      scenarios: { ...DEFAULT_STATE.scenarios, ...parsed.scenarios },
      activation: { ...parsed.activation },
    };
  } catch {
    return DEFAULT_STATE;
  }
};

let state: DemoState = read();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

export const demoStore = {
  get: () => state,
  set: (update: (current: DemoState) => DemoState) => {
    state = update(state);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private window or blocked storage: the demo still works for this tab.
    }
    emit();
  },
  setActivation: (patch: Partial<ActivationRecord>) =>
    demoStore.set((current) => ({ ...current, activation: { ...current.activation, ...patch } })),
  resetActivation: () =>
    demoStore.set((current) => ({ ...current, activation: {}, quickStartSeen: false })),
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const useDemoState = (): DemoState =>
  useSyncExternalStore(demoStore.subscribe, demoStore.get, demoStore.get);

/** Resolves after `ms`, so staged outcomes feel like a real round trip. */
export const stagedDelay = (ms = 1600) => new Promise((resolve) => window.setTimeout(resolve, ms));
