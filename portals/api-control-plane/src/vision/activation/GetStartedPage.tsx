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

import { useEffect } from 'react';
import { Box, Button, ButtonBase, Divider, IconButton, Stack, Tooltip, Typography } from '@wso2/oxygen-ui';
import { Check, Globe, KeyRound, Users, X } from '@wso2/oxygen-ui-icons-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { routes } from '@/routes/paths';
import { DemoPanel } from '../demo/DemoPanel';
import { demoStore } from '../demo/demoStore';
import { type ActivationStepKey, useActivation } from './useActivation';
import { CallStep } from './steps/CallStep';
import { DefineStep } from './steps/DefineStep';
import { DeployStep } from './steps/DeployStep';
import { GatewayStep } from './steps/GatewayStep';

const ORDER: (ActivationStepKey | 'done')[] = ['define', 'gateway', 'deploy', 'call', 'done'];

/**
 * Full-page activation takeover (Stripe-style): one job, one rail, no app
 * chrome competing for attention. Exits back to the console at any point; the
 * setup guide picks up wherever the user left off.
 */
export function GetStartedPage() {
  const { orgHandle = '' } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const activation = useActivation();

  const requested = search.get('step') as ActivationStepKey | 'done' | null;
  const firstOpen = activation.nextStep?.key ?? 'done';
  const step = requested && ORDER.includes(requested) ? requested : firstOpen;

  const goTo = (next: ActivationStepKey | 'done') => setSearch({ step: next }, { replace: false });

  useEffect(() => {
    if (!requested && !activation.isLoading) setSearch({ step: firstOpen }, { replace: true });
  }, [requested, activation.isLoading, firstOpen, setSearch]);

  const exit = () => navigate(routes.organizationHome(orgHandle));

  return (
    <Box sx={{ bgcolor: 'background.default', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'center', borderBottom: 1, borderColor: 'divider', height: 56, px: 2 }}
      >
        <Tooltip title="Exit to console">
          <IconButton aria-label="Exit to console" onClick={exit} size="small">
            <X size={18} />
          </IconButton>
        </Tooltip>
        <Divider flexItem orientation="vertical" sx={{ my: 1.5 }} />
        <Typography sx={{ fontWeight: 600 }} variant="body2">
          Get your first API live
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button onClick={exit} size="small" variant="text">
          I’ll finish later
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ flex: 1 }}>
        <Box
          component="nav"
          aria-label="Setup steps"
          sx={{ borderColor: 'divider', borderRight: { md: 1 }, flex: { md: '0 0 260px' }, px: 3, py: 4 }}
        >
          <Stack spacing={0.5}>
            {activation.steps.map((item, index) => {
              const current = item.key === step;
              const reachable =
                item.complete || index === 0 || activation.steps[index - 1]?.complete;
              return (
                <ButtonBase
                  disabled={!reachable}
                  key={item.key}
                  onClick={() => goTo(item.key)}
                  sx={{
                    alignItems: 'flex-start',
                    borderRadius: 1,
                    display: 'flex',
                    gap: 1.5,
                    justifyContent: 'flex-start',
                    opacity: reachable ? 1 : 0.5,
                    px: 1,
                    py: 1,
                    textAlign: 'left',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <RailMarker complete={item.complete} current={current} />
                  <Box>
                    <Typography sx={{ fontWeight: current ? 700 : 500 }} variant="body2">
                      {item.label}
                    </Typography>
                    <Typography color="text.secondary" variant="caption">
                      {item.hint}
                    </Typography>
                  </Box>
                </ButtonBase>
              );
            })}
            <Box sx={{ opacity: 0.5, pl: 1, pt: 1 }}>
              <Typography color="text.secondary" variant="caption">
                Then: publish to a developer portal, add security, invite your team
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, px: { xs: 2, md: 6 }, py: { xs: 3, md: 6 } }}>
          {step === 'define' && (
            <DefineStep
              onCreated={() => goTo('gateway')}
              project={activation.project}
            />
          )}
          {step === 'gateway' && (
            <GatewayStep
              connectedGateways={activation.connectedGateways}
              gateways={activation.gateways}
              gatewaysLoaded={activation.gatewaysLoaded}
              onConnected={(gatewayId) => {
                demoStore.setActivation({ gatewayId });
                goTo('deploy');
              }}
              refetchGateways={activation.refetchGateways}
            />
          )}
          {step === 'deploy' && (
            <DeployStep api={activation.api} gateway={activation.gateway} onDeployed={() => goTo('call')} />
          )}
          {step === 'call' && (
            <CallStep api={activation.api} gateway={activation.gateway} onConfirmed={() => goTo('done')} />
          )}
          {step === 'done' && (
            <DoneScreen
              apiName={activation.api?.displayName}
              onOpenApi={() =>
                activation.project?.id && activation.api?.id
                  ? navigate(routes.api(orgHandle, activation.project.id, activation.api.id))
                  : exit()
              }
            />
          )}
        </Box>
      </Stack>
      <DemoPanel />
    </Box>
  );
}

function RailMarker({ complete, current }: { complete: boolean; current: boolean }) {
  return (
    <Box
      sx={{
        alignItems: 'center',
        bgcolor: complete ? 'primary.main' : 'transparent',
        border: complete ? 0 : 2,
        borderColor: current ? 'primary.main' : 'divider',
        borderRadius: '50%',
        color: 'primary.contrastText',
        display: 'flex',
        flexShrink: 0,
        height: 20,
        justifyContent: 'center',
        mt: 0.25,
        width: 20,
      }}
    >
      {complete && <Check size={13} strokeWidth={3} />}
    </Box>
  );
}

function DoneScreen({ apiName, onOpenApi }: { apiName?: string; onOpenApi: () => void }) {
  const next = [
    { icon: KeyRound, title: 'Secure it', body: 'Require an API key before your API goes public.' },
    { icon: Globe, title: 'Publish it', body: 'List it in a developer portal so others can subscribe.' },
    { icon: Users, title: 'Invite your team', body: 'Share the work and review changes together.' },
  ];
  return (
    <Stack spacing={4} sx={{ maxWidth: 720 }}>
      <Box>
        <Typography color="primary" sx={{ fontWeight: 600, letterSpacing: 0.4 }} variant="caption">
          YOU’RE LIVE
        </Typography>
        <Typography component="h1" sx={{ fontWeight: 700, mt: 0.5 }} variant="h4">
          {apiName ?? 'Your API'} is serving real traffic
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
          That’s the whole loop: define, run, deploy, call. Here’s what most teams do next.
        </Typography>
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        {next.map(({ icon: Icon, title, body }) => (
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
      <Box>
        <Button onClick={onOpenApi} size="large" variant="contained">
          Go to my API
        </Button>
      </Box>
    </Stack>
  );
}
