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

import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@wso2/oxygen-ui';
import { WandSparkles, X } from '@wso2/oxygen-ui-icons-react';

import { demoStore, type Scenario, useDemoState, type WizardVariant } from './demoStore';

const SCENARIO_ROWS: { key: 'gateway' | 'deploy' | 'firstCall'; label: string }[] = [
  { key: 'gateway', label: 'Gateway connects' },
  { key: 'deploy', label: 'Deploy' },
  { key: 'firstCall', label: 'First call' },
];

/**
 * Vision prototype only: a presenter's control for staging outcomes without
 * touching real infrastructure. "Real" uses the live backend.
 */
export function DemoPanel() {
  const demo = useDemoState();

  if (!demo.panelOpen) {
    return (
      <Button
        onClick={() => demoStore.set((state) => ({ ...state, panelOpen: true }))}
        size="small"
        startIcon={<WandSparkles size={14} />}
        sx={{ bottom: 16, left: 16, opacity: 0.6, position: 'fixed', zIndex: 1400, '&:hover': { opacity: 1 } }}
        variant="outlined"
      >
        Demo
      </Button>
    );
  }

  const setScenario = (key: 'gateway' | 'deploy' | 'firstCall', value: Scenario) =>
    demoStore.set((state) => ({ ...state, scenarios: { ...state.scenarios, [key]: value } }));

  return (
    <Paper
      elevation={8}
      sx={{ bottom: 16, left: 16, p: 2, position: 'fixed', width: 320, zIndex: 1400 }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', mb: 1.5 }}>
        <Typography sx={{ fontWeight: 700, flex: 1 }} variant="body2">
          Demo controls
        </Typography>
        <IconButton
          aria-label="Close demo controls"
          onClick={() => demoStore.set((state) => ({ ...state, panelOpen: false }))}
          size="small"
        >
          <X size={16} />
        </IconButton>
      </Stack>

      <Typography color="text.secondary" variant="caption">
        Create flow
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        onChange={(_, value: WizardVariant | null) =>
          value && demoStore.set((state) => ({ ...state, wizardVariant: value }))
        }
        size="small"
        sx={{ mb: 1.5, mt: 0.5 }}
        value={demo.wizardVariant}
      >
        <ToggleButton value="takeover">Full-page</ToggleButton>
        <ToggleButton value="modal">Modal</ToggleButton>
      </ToggleButtonGroup>

      <Stack spacing={1}>
        {SCENARIO_ROWS.map((row) => (
          <Box key={row.key}>
            <Typography color="text.secondary" variant="caption">
              {row.label}
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              onChange={(_, value: Scenario | null) => value && setScenario(row.key, value)}
              size="small"
              sx={{ mt: 0.5 }}
              value={demo.scenarios[row.key]}
            >
              <ToggleButton value="real">Real</ToggleButton>
              <ToggleButton value="success">Succeeds</ToggleButton>
              <ToggleButton value="failure">Fails</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        ))}
      </Stack>

      <TextField
        fullWidth
        helperText="What a Docker gateway on this machine dials"
        label="Control plane address"
        onChange={(event) =>
          demoStore.set((state) => ({ ...state, controlPlaneHost: event.target.value }))
        }
        size="small"
        sx={{ mt: 2 }}
        value={demo.controlPlaneHost}
      />

      <Button
        fullWidth
        onClick={() => demoStore.resetActivation()}
        size="small"
        sx={{ mt: 1.5 }}
        variant="outlined"
      >
        Reset walkthrough progress
      </Button>
    </Paper>
  );
}
