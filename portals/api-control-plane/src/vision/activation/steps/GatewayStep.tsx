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

import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Stack,
  Typography,
  alpha,
} from '@wso2/oxygen-ui';
import { Check, Server, TriangleAlert } from '@wso2/oxygen-ui-icons-react';

import {
  useCreateGateway,
  useRotateGatewayToken,
  type Gateway,
} from '@/api/resources/gateways';
import { CopyableCommand } from '@/pages/appShell/appShellPages/gateways/components/CopyableCommand';
import { demoStore, stagedDelay, useDemoState } from '../../demo/demoStore';
import { StepHeader } from '../StepHeader';

/** The newest published API gateway release; the console's own link 404s. */
const GATEWAY_RELEASE = '2026.09.24';
const DIST = `wso2apip-api-gateway-${GATEWAY_RELEASE}`;
const POLL_MS = 3000;

type Phase = 'choose' | 'creating' | 'waiting' | 'connected' | 'stalled';

const FIRST_GATEWAY_ID = 'my-first-gateway';

export function GatewayStep({
  gateways,
  gatewaysLoaded,
  connectedGateways,
  refetchGateways,
  onConnected,
  embedded = false,
}: {
  gateways: Gateway[];
  gatewaysLoaded: boolean;
  connectedGateways: Gateway[];
  refetchGateways: () => unknown;
  onConnected: (gatewayId: string) => void;
  /** Rendered inside an API's quickstart card rather than the full-page flow. */
  embedded?: boolean;
}) {
  const demo = useDemoState();
  const scenario = demo.scenarios.gateway;
  const [phase, setPhase] = useState<Phase>(connectedGateways.length > 0 ? 'choose' : 'creating');
  const [pickedId, setPickedId] = useState(connectedGateways[0]?.id);
  const [newGatewayId, setNewGatewayId] = useState<string>();
  const [createFailed, setCreateFailed] = useState(false);
  const createGateway = useCreateGateway();
  const creatingRef = useRef(false);

  // Start setup straight away when nothing is connected: the record is a
  // detail the user shouldn't have to fill a form for. Waits for the list so a
  // returning user reuses their gateway instead of hitting a 409.
  useEffect(() => {
    if (phase !== 'creating' || !gatewaysLoaded || creatingRef.current) return;
    creatingRef.current = true;
    const adopt = (id: string) => {
      setNewGatewayId(id);
      setPhase('waiting');
    };
    if (gateways.some((gateway) => gateway.id === FIRST_GATEWAY_ID)) {
      adopt(FIRST_GATEWAY_ID);
      return;
    }
    createGateway
      .mutateAsync({
        displayName: 'My first gateway',
        id: FIRST_GATEWAY_ID,
        endpoints: [demo.localGatewayUrl],
        functionalityType: 'regular',
        isCritical: false,
        properties: { environment: 'development', gatewayMode: 'self-hosted' },
        version: '1.0',
      })
      .then((gateway) => adopt(gateway.id ?? FIRST_GATEWAY_ID))
      .catch((cause: { status?: number }) => {
        if (cause?.status === 409) adopt(FIRST_GATEWAY_ID);
        else setCreateFailed(true);
      });
  }, [phase, gatewaysLoaded, gateways, createGateway, demo.localGatewayUrl]);

  // Watch for the new gateway to come online (or stage it in demo mode).
  useEffect(() => {
    if (phase !== 'waiting' || !newGatewayId) return;
    if (scenario !== 'real') {
      let cancelled = false;
      void stagedDelay(scenario === 'success' ? 5000 : 8000).then(() => {
        if (!cancelled) setPhase(scenario === 'success' ? 'connected' : 'stalled');
      });
      return () => {
        cancelled = true;
      };
    }
    const timer = window.setInterval(() => void refetchGateways(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [phase, newGatewayId, scenario, refetchGateways]);

  useEffect(() => {
    if (phase !== 'waiting' || scenario !== 'real' || !newGatewayId) return;
    if (gateways.find((gateway) => gateway.id === newGatewayId)?.isActive) setPhase('connected');
  }, [gateways, newGatewayId, phase, scenario]);

  useEffect(() => {
    if (phase === 'connected' && newGatewayId) demoStore.setActivation({ gatewayId: newGatewayId });
  }, [phase, newGatewayId]);

  if (phase === 'choose') {
    return (
      <Stack spacing={3} sx={{ maxWidth: 620 }}>
        {!embedded && (
          <StepHeader
            eyebrow="Step 2"
            title="Choose where your API runs"
            subtitle="You already have a connected gateway. Use it, or set up another."
          />
        )}
        <Stack spacing={1.25}>
          {connectedGateways.map((gateway) => {
            const selected = gateway.id === pickedId;
            return (
              <ButtonBase
                key={gateway.id}
                onClick={() => setPickedId(gateway.id)}
                sx={(theme) => ({
                  alignItems: 'center',
                  border: 1,
                  borderColor: selected ? 'primary.main' : 'divider',
                  borderRadius: 1.5,
                  bgcolor: selected ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                  display: 'flex',
                  gap: 1.5,
                  justifyContent: 'flex-start',
                  p: 2,
                  textAlign: 'left',
                })}
              >
                <Server size={18} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 600 }} variant="body2">
                    {gateway.displayName}
                  </Typography>
                  <Typography color="text.secondary" sx={{ fontFamily: 'monospace' }} variant="caption">
                    {gateway.endpoints?.[0]}
                  </Typography>
                </Box>
                <Chip color="success" label="Connected" size="small" variant="outlined" />
              </ButtonBase>
            );
          })}
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Button
            disabled={!pickedId}
            onClick={() => pickedId && onConnected(pickedId)}
            size="large"
            variant="contained"
          >
            Use this gateway
          </Button>
          <Button onClick={() => setPhase('creating')} variant="text">
            Set up a new gateway
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      {!embedded && (
        <StepHeader
          eyebrow="Step 2"
          title="Run a gateway on your machine"
          subtitle="Your gateway is the runtime that serves API traffic. Paste these into a terminal; this page updates when it connects."
        />
      )}

      {createFailed && (
        <Alert severity="error">We couldn’t prepare a gateway record. Reload the page to try again.</Alert>
      )}

      {phase === 'creating' && !createFailed && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={18} />
          <Typography variant="body2">Preparing your gateway…</Typography>
        </Stack>
      )}

      {newGatewayId && phase !== 'creating' && (
        <SetupCommands controlPlaneHost={demo.controlPlaneHost} gatewayId={newGatewayId} />
      )}

      {phase === 'waiting' && (
        <StatusRow tone="pending">Waiting for your gateway to connect…</StatusRow>
      )}

      {phase === 'stalled' && (
        <Alert icon={<TriangleAlert size={18} />} severity="warning">
          <Typography sx={{ fontWeight: 600 }} variant="body2">
            Your gateway hasn’t connected yet
          </Typography>
          <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
            <li>Is Docker running? Check with <code>docker ps</code>.</li>
            <li>Did step 3 finish? The settings file must include both lines.</li>
            <li>
              Running the gateway on another machine? Replace <code>{demo.controlPlaneHost}</code>{' '}
              with an address that machine can reach.
            </li>
          </Box>
          <Button onClick={() => setPhase('waiting')} size="small" sx={{ mt: 1 }} variant="outlined">
            Check again
          </Button>
        </Alert>
      )}

      {phase === 'connected' && (
        <Stack spacing={2}>
          <StatusRow tone="success">My first gateway is connected</StatusRow>
          <Box>
            <Button
              onClick={() => newGatewayId && onConnected(newGatewayId)}
              size="large"
              variant="contained"
            >
              Continue
            </Button>
          </Box>
        </Stack>
      )}

      {connectedGateways.length > 0 && phase !== 'connected' && (
        <Box>
          <Button onClick={() => setPhase('choose')} variant="text">
            Use an existing gateway instead
          </Button>
        </Box>
      )}
    </Stack>
  );
}

function SetupCommands({
  gatewayId,
  controlPlaneHost,
}: {
  gatewayId: string;
  controlPlaneHost: string;
}) {
  const rotate = useRotateGatewayToken(gatewayId);
  const requested = useRef(false);
  const [token, setToken] = useState<string>();

  // An awaited promise, not per-call callbacks: StrictMode's double mount can
  // drop those, leaving the token stuck on "generating".
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    rotate
      .mutateAsync()
      .then((result) => setToken(result.token))
      .catch(() => undefined);
  }, [rotate]);

  const steps = [
    {
      title: 'Download the gateway',
      code: `curl -LO https://github.com/wso2/api-platform/releases/download/gateway/v${GATEWAY_RELEASE}/${DIST}.zip\nunzip ${DIST}.zip && cd ${DIST}`,
    },
    { title: 'Run the one-time setup (press Enter at both prompts)', code: './scripts/setup.sh' },
    {
      title: 'Connect it to this console',
      code:
        `cat >> api-platform.env << 'EOF'\n` +
        `APIP_GW_CONTROLLER_CONTROLPLANE_HOST=${controlPlaneHost}\n` +
        `APIP_GW_CONTROLLER_CONTROLPLANE_TOKEN=${token ?? (rotate.isError ? '<could not generate — reload to retry>' : '…generating…')}\n` +
        'EOF',
    },
    { title: 'Start it', code: 'docker compose up' },
  ];

  return (
    <Stack spacing={2.5}>
      <Typography color="text.secondary" variant="body2">
        Needs Docker. Takes about two minutes the first time.
      </Typography>
      {steps.map((step, index) => (
        <Stack direction="row" key={step.title} spacing={2}>
          <Box
            sx={{
              alignItems: 'center',
              border: 1,
              borderColor: 'divider',
              borderRadius: '50%',
              display: 'flex',
              flexShrink: 0,
              fontSize: 13,
              fontWeight: 600,
              height: 26,
              justifyContent: 'center',
              mt: 0.25,
              width: 26,
            }}
          >
            {index + 1}
          </Box>
          <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600 }} variant="body2">
              {step.title}
            </Typography>
            <CopyableCommand code={step.code} />
          </Stack>
        </Stack>
      ))}
      <Typography color="text.secondary" variant="caption">
        The token is included above and works once. Lost it? Come back here and we’ll make a new one.
      </Typography>
    </Stack>
  );
}

export function StatusRow({
  tone,
  children,
}: {
  tone: 'pending' | 'success' | 'error';
  children: React.ReactNode;
}) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={(theme) => ({
        alignItems: 'center',
        bgcolor: alpha(
          tone === 'success'
            ? theme.palette.success.main
            : tone === 'error'
              ? theme.palette.error.main
              : theme.palette.text.primary,
          0.06,
        ),
        borderRadius: 1.5,
        px: 2,
        py: 1.5,
      })}
    >
      {tone === 'pending' && <CircularProgress size={16} />}
      {tone === 'success' && <Check size={18} />}
      {tone === 'error' && <TriangleAlert size={18} />}
      <Typography sx={{ fontWeight: 500 }} variant="body2">
        {children}
      </Typography>
    </Stack>
  );
}
