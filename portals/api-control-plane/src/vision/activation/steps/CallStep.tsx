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

import { useMemo, useState } from 'react';
import { Box, Button, CodeBlock, Collapse, Stack, Typography } from '@wso2/oxygen-ui';
import { ChevronDown, ChevronUp } from '@wso2/oxygen-ui-icons-react';

import type { Gateway } from '@/api/resources/gateways';
import { useRestApiOpenApi, type RestApi } from '@/api/resources/restApis';
import { parseSpecContent } from '@/api/resources/restApis/restApis.utils';
import { buildInvokeUrl } from '@/pages/appShell/appShellPages/apis/overview/InvokeUrlPanel';
import { CopyableCommand } from '@/pages/appShell/appShellPages/gateways/components/CopyableCommand';
import { demoStore, stagedDelay, useDemoState } from '../../demo/demoStore';
import { firstCallPath, operationsOf } from '../sources';
import { StepHeader } from '../StepHeader';
import { StatusRow } from './GatewayStep';

const SAMPLE_RESPONSE = `{
  "books": [
    { "id": "1d4c…0e73", "title": "The Great Gatsby", "author": "F. Scott Fitzgerald", "status": "read" },
    { "id": "be8c…14b6", "title": "1984", "author": "George Orwell", "status": "to_read" }
  ]
}`;

export function CallStep({
  api,
  gateway,
  onConfirmed,
  embedded = false,
}: {
  api?: RestApi;
  gateway?: Gateway;
  onConfirmed: () => void;
  embedded?: boolean;
}) {
  const demo = useDemoState();
  const scenario = demo.scenarios.firstCall;
  const openApi = useRestApiOpenApi(api?.id);
  const [showResponse, setShowResponse] = useState(false);
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);

  const path = useMemo(() => {
    const content = openApi.data?.content;
    if (!content) return '/';
    try {
      return firstCallPath(operationsOf(parseSpecContent(content) as never));
    } catch {
      return '/';
    }
  }, [openApi.data?.content]);

  const invokeUrl = buildInvokeUrl(
    gateway?.endpoints?.[0] ?? 'https://localhost:8443',
    api?.context,
  );
  const url = `${invokeUrl.replace(/\/+$/, '')}${path === '/' ? '' : path}`;
  const command = `curl -k '${url}'`;

  const confirm = async () => {
    setFailed(false);
    if (scenario === 'real') {
      demoStore.setActivation({ firstCallConfirmed: true });
      onConfirmed();
      return;
    }
    setChecking(true);
    await stagedDelay(1800);
    setChecking(false);
    if (scenario === 'success') {
      demoStore.setActivation({ firstCallConfirmed: true });
      onConfirmed();
    } else {
      setFailed(true);
    }
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      {!embedded && (
        <StepHeader
          eyebrow="Step 4"
          title="Make your first call"
          subtitle="Your API is live. Call it through the gateway and see a real response."
        />
      )}

      <Stack spacing={1}>
        <CopyableCommand code={command} />
        <Typography color="text.secondary" variant="caption">
          <code>-k</code> skips the certificate check, which is expected for a local gateway with a
          self-signed certificate.
        </Typography>
      </Stack>

      <Box>
        <Button
          endIcon={showResponse ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          onClick={() => setShowResponse((open) => !open)}
          size="small"
          variant="text"
        >
          What you should see
        </Button>
        <Collapse in={showResponse}>
          <Box sx={{ pt: 1 }}>
            <CodeBlock code={SAMPLE_RESPONSE} language="json" />
          </Box>
        </Collapse>
      </Box>

      {checking && (
        <StatusRow tone="pending">Listening for your request on {gateway?.displayName}…</StatusRow>
      )}
      {failed && (
        <StatusRow tone="error">
          The gateway answered 401 Unauthorized. Your API may have security turned on: add the
          header <code>Authorization: Bearer &lt;key&gt;</code> or turn off security for testing.
        </StatusRow>
      )}

      <Stack direction="row" spacing={1.5}>
        <Button disabled={checking} onClick={confirm} size="large" variant="contained">
          {scenario === 'real' ? 'I got a response' : 'Check for my request'}
        </Button>
      </Stack>
    </Stack>
  );
}
