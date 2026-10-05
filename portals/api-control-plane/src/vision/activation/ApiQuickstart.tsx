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

import { useEffect, useState } from 'react';
import { Box, ButtonBase, Collapse, IconButton, Paper, Stack, Typography } from '@wso2/oxygen-ui';
import { Check, ChevronDown, ChevronUp, Globe, KeyRound } from '@wso2/oxygen-ui-icons-react';

import { useGateways } from '@/api/resources/gateways';
import type { RestApi } from '@/api/resources/restApis';
import { useDeployments } from '@/api/resources/restApis/deployments';
import { demoStore, useDemoState } from '../demo/demoStore';
import { CallStep } from './steps/CallStep';
import { DeployStep } from './steps/DeployStep';
import { GatewayStep } from './steps/GatewayStep';

type StepKey = 'gateway' | 'deploy' | 'call' | 'next';

/**
 * Vision: activation lives on the API's own page (Kong / Portkey), not in a
 * separate wizard or a widget that follows you around. Everything a first-time
 * user needs after creating the API, in order, in one card.
 */
export function ApiQuickstart({ api }: { api: RestApi }) {
  const demo = useDemoState();
  const gatewaysQuery = useGateways();
  const gateways = gatewaysQuery.data?.list ?? [];
  const connected = gateways.filter((gateway) => gateway.isActive === true);
  const deploymentsQuery = useDeployments(api.id);
  const deployments = deploymentsQuery.data?.list ?? [];

  const chosenId = demo.activation.apiId === api.id ? demo.activation.gatewayId : undefined;
  const gateway = gateways.find((candidate) => candidate.id === chosenId) ?? connected[0];
  const live = deployments.some((deployment) => deployment.status === 'DEPLOYED');
  const called = demo.activation.apiId === api.id && Boolean(demo.activation.firstCallConfirmed);

  const done = {
    gateway: Boolean(gateway?.isActive) || demo.scenarios.gateway === 'success',
    deploy: live || demo.scenarios.deploy === 'success',
    call: called,
  };
  const firstOpen: StepKey = !done.gateway ? 'gateway' : !done.deploy ? 'deploy' : !done.call ? 'call' : 'next';
  const [picked, setPicked] = useState<StepKey>();
  const [collapsed, setCollapsed] = useState(false);
  // Pin the opening step once the data is in, so finishing a step shows its
  // confirmation instead of the card jumping ahead underneath the user.
  const ready = gatewaysQuery.isSuccess && (!api.id || deploymentsQuery.isSuccess);
  useEffect(() => {
    if (ready && picked === undefined) setPicked(firstOpen);
  }, [ready, picked, firstOpen]);
  const active = picked ?? firstOpen;

  const steps: { key: StepKey; label: string; complete: boolean }[] = [
    { key: 'gateway', label: 'Connect a gateway', complete: done.gateway },
    { key: 'deploy', label: 'Deploy', complete: done.deploy },
    { key: 'call', label: 'Make your first call', complete: done.call },
    { key: 'next', label: 'Next steps', complete: false },
  ];
  const completeCount = [done.gateway, done.deploy, done.call].filter(Boolean).length;

  const advance = (next: StepKey) => setPicked(next);

  return (
    <Paper sx={{ border: 1, borderColor: 'divider', mb: 2, mt: 2 }} variant="outlined">
      <Stack direction="row" sx={{ alignItems: 'center', px: 3, py: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700 }} variant="h6">
            {completeCount === 3 ? `${api.displayName} is live` : `Get ${api.displayName} live`}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {completeCount === 3
              ? 'Your API is serving traffic. Here’s what most teams do next.'
              : `${completeCount} of 3 done`}
          </Typography>
        </Box>
        <IconButton
          aria-label={collapsed ? 'Expand quickstart' : 'Collapse quickstart'}
          onClick={() => setCollapsed((value) => !value)}
          size="small"
        >
          {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </IconButton>
      </Stack>
      <Collapse in={!collapsed}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ borderColor: 'divider', borderTop: 1, minHeight: 280 }}
        >
          <Stack spacing={0.5} sx={{ borderColor: 'divider', borderRight: { md: 1 }, flex: { md: '0 0 240px' }, p: 1.5 }}>
            {steps.map((step, index) => {
              const selected = step.key === active;
              return (
                <ButtonBase
                  aria-current={selected ? 'step' : undefined}
                  key={step.key}
                  onClick={() => setPicked(step.key)}
                  sx={{
                    alignItems: 'center',
                    bgcolor: selected ? 'action.selected' : 'transparent',
                    borderRadius: 1,
                    display: 'flex',
                    gap: 1.25,
                    justifyContent: 'flex-start',
                    px: 1.25,
                    py: 1.25,
                    textAlign: 'left',
                    '&:hover': { bgcolor: selected ? 'action.selected' : 'action.hover' },
                  }}
                >
                  <Box
                    sx={{
                      alignItems: 'center',
                      bgcolor: step.complete ? 'success.main' : 'transparent',
                      border: step.complete ? 0 : 1,
                      borderColor: 'divider',
                      borderRadius: '50%',
                      color: 'common.white',
                      display: 'flex',
                      flexShrink: 0,
                      fontSize: 12,
                      fontWeight: 600,
                      height: 22,
                      justifyContent: 'center',
                      width: 22,
                    }}
                  >
                    {step.complete ? <Check size={13} strokeWidth={3} /> : index + 1}
                  </Box>
                  <Typography sx={{ fontWeight: selected ? 600 : 400 }} variant="body2">
                    {step.label}
                  </Typography>
                </ButtonBase>
              );
            })}
          </Stack>
          <Box sx={{ flex: 1, minWidth: 0, p: 3 }}>
            {active === 'gateway' && (
              <GatewayStep
                connectedGateways={connected}
                embedded
                gateways={gateways}
                gatewaysLoaded={gatewaysQuery.isSuccess}
                onConnected={(gatewayId) => {
                  demoStore.setActivation({ apiId: api.id, gatewayId });
                  advance('deploy');
                }}
                refetchGateways={gatewaysQuery.refetch}
              />
            )}
            {active === 'deploy' && (
              <DeployStep api={api} embedded gateway={gateway} onDeployed={() => advance('call')} />
            )}
            {active === 'call' && (
              <CallStep
                api={api}
                embedded
                gateway={gateway}
                onConfirmed={() => {
                  demoStore.setActivation({ apiId: api.id, firstCallConfirmed: true });
                  advance('next');
                }}
              />
            )}
            {active === 'next' && <NextSteps />}
          </Box>
        </Stack>
      </Collapse>
    </Paper>
  );
}

function NextSteps() {
  const items = [
    { icon: KeyRound, title: 'Secure it', body: 'Require an API key before your API goes public. Open the Policies tab.' },
    { icon: Globe, title: 'Publish it', body: 'List it in a developer portal so consumers can discover and subscribe. Open the Publish tab.' },
  ];
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      {items.map(({ icon: Icon, title, body }) => (
        <Box key={title} sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, flex: 1, p: 2 }}>
          <Icon size={18} />
          <Typography sx={{ fontWeight: 600, mt: 1 }} variant="body2">
            {title}
          </Typography>
          <Typography color="text.secondary" variant="caption">
            {body}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
