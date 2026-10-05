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

import { useState } from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@wso2/oxygen-ui';
import { ArrowRight, Rocket, Server } from '@wso2/oxygen-ui-icons-react';

import type { Gateway } from '@/api/resources/gateways';
import type { RestApi } from '@/api/resources/restApis';
import { useDeployApi, useDeployments } from '@/api/resources/restApis/deployments';
import { stagedDelay, useDemoState } from '../../demo/demoStore';
import { StepHeader } from '../StepHeader';
import { StatusRow } from './GatewayStep';

type Staged = 'idle' | 'deploying' | 'live' | 'failed';

export function DeployStep({
  api,
  gateway,
  onDeployed,
}: {
  api?: RestApi;
  gateway?: Gateway;
  onDeployed: () => void;
}) {
  const demo = useDemoState();
  const scenario = demo.scenarios.deploy;
  const deployApi = useDeployApi();
  const deploymentsQuery = useDeployments(api?.id);
  const [staged, setStaged] = useState<Staged>('idle');
  const [error, setError] = useState<string>();

  const current = (deploymentsQuery.data?.list ?? []).find(
    (deployment) => deployment.gatewayId === gateway?.id,
  );
  const realStatus = current?.status;

  const status: Staged =
    scenario !== 'real'
      ? staged
      : realStatus === 'DEPLOYED'
        ? 'live'
        : realStatus === 'DEPLOYING' || deployApi.isPending
          ? 'deploying'
          : realStatus === 'FAILED' || error
            ? 'failed'
            : 'idle';

  const deploy = async () => {
    setError(undefined);
    if (scenario !== 'real') {
      setStaged('deploying');
      await stagedDelay(2400);
      setStaged(scenario === 'success' ? 'live' : 'failed');
      return;
    }
    if (!api?.id || !gateway?.id) return;
    const stamp = new Date().toISOString().slice(0, 10);
    deployApi.mutate(
      { restApiId: api.id, body: { name: `first-deploy_${stamp}_${Date.now() % 1000}`, gatewayId: gateway.id, base: 'current' } },
      { onError: (cause) => setError(cause.message) },
    );
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 620 }}>
      <StepHeader
        eyebrow="Step 3"
        title="Deploy your API"
        subtitle="Send your API’s configuration to the gateway so it starts serving requests."
      />

      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: 1.5, p: 2 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography color="text.secondary" variant="caption">
            API
          </Typography>
          <Typography sx={{ fontWeight: 600 }} variant="body2">
            {api?.displayName ?? '—'} {api?.version && `v${api.version}`}
          </Typography>
        </Box>
        <ArrowRight size={18} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography color="text.secondary" variant="caption">
            Gateway
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Server size={14} />
            <Typography sx={{ fontWeight: 600 }} variant="body2">
              {gateway?.displayName ?? '—'}
            </Typography>
          </Stack>
        </Box>
      </Stack>

      {status === 'idle' && (
        <Box>
          <Button onClick={deploy} size="large" startIcon={<Rocket size={16} />} variant="contained">
            Deploy
          </Button>
        </Box>
      )}
      {status === 'deploying' && <StatusRow tone="pending">Deploying to {gateway?.displayName}…</StatusRow>}
      {status === 'failed' && (
        <Stack spacing={1.5}>
          <StatusRow tone="error">
            Deployment didn’t finish. {error ?? 'The gateway rejected the configuration or went offline.'}
          </StatusRow>
          <Box>
            <Button onClick={deploy} variant="outlined">
              Try again
            </Button>
          </Box>
        </Stack>
      )}
      {status === 'live' && (
        <Stack spacing={2}>
          <StatusRow tone="success">Live on {gateway?.displayName}</StatusRow>
          <Box>
            <Button onClick={onDeployed} size="large" variant="contained">
              Continue
            </Button>
          </Box>
        </Stack>
      )}
      {deploymentsQuery.isPending && api?.id && scenario === 'real' && <CircularProgress size={16} />}
    </Stack>
  );
}
