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
import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@wso2/oxygen-ui';
import { ArrowRight, Check, ChevronDown, ChevronUp, Rocket, X } from '@wso2/oxygen-ui-icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import { routes } from '@/routes/paths';
import { demoStore, useDemoState } from '../demo/demoStore';
import { useActivation } from './useActivation';

/**
 * Floating, collapsible setup guide (Stripe's pattern): the cross-page
 * throughline for activation, instead of a per-API stepper banner or a
 * badge on whichever sidebar item happens to be next.
 */
export function SetupGuide() {
  const { orgHandle = '' } = useParams();
  const navigate = useNavigate();
  const demo = useDemoState();
  const activation = useActivation();
  const [expanded, setExpanded] = useState(false);

  if (!demo.floatingGuide || demo.activation.guideDismissed || activation.isLoading) return null;

  const done = activation.completed === activation.total;
  const open = (step?: string) =>
    navigate(`${routes.getStarted(orgHandle)}${step ? `?step=${step}` : ''}`);

  return (
    <Paper
      elevation={10}
      sx={{ bottom: 20, overflow: 'hidden', position: 'fixed', right: 20, width: expanded ? 320 : 280, zIndex: 1300 }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', pl: 2, pr: 1, py: 1.25 }}>
        <ProgressRing value={(activation.completed / activation.total) * 100} />
        <ButtonBase
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          sx={{ alignItems: 'flex-start', display: 'flex', flex: 1, flexDirection: 'column', textAlign: 'left' }}
        >
          <Typography sx={{ fontWeight: 700 }} variant="body2">
            Setup guide
          </Typography>
          <Typography color="text.secondary" noWrap variant="caption">
            {done ? 'All set: your API is live' : `Next: ${activation.nextStep?.label}`}
          </Typography>
        </ButtonBase>
        <IconButton aria-label={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpanded((value) => !value)} size="small">
          {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </IconButton>
        <IconButton
          aria-label="Dismiss setup guide"
          onClick={() => demoStore.setActivation({ guideDismissed: true })}
          size="small"
        >
          <X size={16} />
        </IconButton>
      </Stack>
      <LinearProgress
        sx={{ height: 2 }}
        value={(activation.completed / activation.total) * 100}
        variant="determinate"
      />
      {expanded && (
        <Stack spacing={0.25} sx={{ p: 1 }}>
          {activation.steps.map((step) => {
            const isNext = step.key === activation.nextStep?.key;
            return (
              <ButtonBase
                key={step.key}
                onClick={() => open(step.key)}
                sx={{
                  alignItems: 'center',
                  borderRadius: 1,
                  display: 'flex',
                  gap: 1.25,
                  justifyContent: 'flex-start',
                  px: 1,
                  py: 1,
                  textAlign: 'left',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Box
                  sx={{
                    alignItems: 'center',
                    bgcolor: step.complete ? 'primary.main' : 'transparent',
                    border: step.complete ? 0 : 2,
                    borderColor: isNext ? 'primary.main' : 'divider',
                    borderRadius: '50%',
                    color: 'primary.contrastText',
                    display: 'flex',
                    flexShrink: 0,
                    height: 18,
                    justifyContent: 'center',
                    width: 18,
                  }}
                >
                  {step.complete && <Check size={12} strokeWidth={3} />}
                </Box>
                <Typography
                  sx={{ flex: 1, fontWeight: isNext ? 600 : 400, textDecoration: step.complete ? 'line-through' : 'none' }}
                  variant="body2"
                >
                  {step.label}
                </Typography>
                {isNext && <ArrowRight size={14} />}
              </ButtonBase>
            );
          })}
          {!done && (
            <Button
              onClick={() => open(activation.nextStep?.key)}
              size="small"
              startIcon={<Rocket size={14} />}
              sx={{ m: 1 }}
              variant="contained"
            >
              Continue setup
            </Button>
          )}
        </Stack>
      )}
    </Paper>
  );
}

function ProgressRing({ value }: { value: number }) {
  return (
    <Box sx={{ display: 'inline-flex', position: 'relative' }}>
      <CircularProgress size={28} sx={{ color: 'divider', position: 'absolute' }} thickness={5} value={100} variant="determinate" />
      <CircularProgress size={28} thickness={5} value={value} variant="determinate" />
    </Box>
  );
}

/**
 * Home-page stepper banner (Stripe's "Continue activating"), shown only until
 * activation. It points at where the work actually is: the create popover
 * first, then the API's own quickstart card.
 */
export function ActivationHero() {
  const { orgHandle = '' } = useParams();
  const navigate = useNavigate();
  const activation = useActivation();
  const demo = useDemoState();

  // The standalone Quick Start greets an empty organization once, as it would
  // at sign-up; after that it's opt-in from here or the sidebar.
  const isEmpty = !activation.isLoading && !activation.api;
  useEffect(() => {
    if (!isEmpty || !demo.quickStartOnFirstVisit || demo.quickStartSeen) return;
    demoStore.set((state) => ({ ...state, quickStartSeen: true }));
    navigate(routes.getStarted(orgHandle));
  }, [isEmpty, demo.quickStartOnFirstVisit, demo.quickStartSeen, navigate, orgHandle]);

  if (activation.isLoading || activation.completed === activation.total) return null;

  const nextIndex = activation.steps.findIndex((step) => !step.complete);
  const resume = () => {
    if (!activation.api?.id || !activation.project?.id) {
      navigate(`${routes.allApis(orgHandle)}?create=1`);
      return;
    }
    navigate(routes.api(orgHandle, activation.project.id, activation.api.id));
  };

  return (
    <Paper sx={{ border: 1, borderColor: 'divider', p: 3 }} variant="outlined">
      <Typography sx={{ fontWeight: 700 }} variant="h5">
        {activation.completed === 0 ? 'Get your first API live' : 'Continue getting your first API live'}
      </Typography>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', my: 2, maxWidth: 640 }}>
        {activation.steps.map((step, index) => (
          <Stack direction="row" key={step.key} spacing={0.75} sx={{ alignItems: 'center', flex: index < activation.steps.length - 1 ? 1 : '0 0 auto' }}>
            <Box
              sx={{
                alignItems: 'center',
                bgcolor: step.complete ? 'primary.main' : index === nextIndex ? 'transparent' : 'action.disabledBackground',
                border: index === nextIndex ? 2 : 0,
                borderColor: 'primary.main',
                borderRadius: '50%',
                color: step.complete ? 'primary.contrastText' : 'text.secondary',
                display: 'flex',
                flexShrink: 0,
                fontSize: 12,
                fontWeight: 700,
                height: 24,
                justifyContent: 'center',
                width: 24,
              }}
            >
              {step.complete ? <Check size={13} strokeWidth={3} /> : index + 1}
            </Box>
            {index < activation.steps.length - 1 && (
              <Box sx={{ bgcolor: step.complete ? 'primary.main' : 'divider', borderRadius: 1, flex: 1, height: 4 }} />
            )}
          </Stack>
        ))}
      </Stack>
      <Typography sx={{ mb: 2 }} variant="body1">
        <strong>Step {nextIndex + 1}:</strong> {activation.nextStep?.label}. {activation.nextStep?.hint}.
      </Typography>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Button endIcon={<ArrowRight size={16} />} onClick={resume} variant="contained">
          {activation.completed === 0 ? 'Create your first API' : 'Continue'}
        </Button>
        <Button onClick={() => navigate(routes.getStarted(orgHandle))} variant="text">
          Prefer a guided walkthrough? Open Quick Start
        </Button>
      </Stack>
    </Paper>
  );
}
