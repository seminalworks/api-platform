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
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Collapse,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@wso2/oxygen-ui';
import { ChevronDown, ChevronUp, FileCode2, Globe, Sparkles } from '@wso2/oxygen-ui-icons-react';

import { useCreateProject, type Project } from '@/api/resources/projects';
import { useImportOpenApi, useValidateOpenApiSpec } from '@/api/resources/restApis';
import { demoStore } from '../../demo/demoStore';
import {
  SAMPLE_BACKEND_URL,
  operationsOf,
  passthroughSpec,
  sampleSpec,
  specFile,
  toContext,
  toHandle,
  type PreviewOperation,
  type SourceKind,
} from '../sources';
import { StepHeader } from '../StepHeader';

type SourceOption = {
  kind: SourceKind;
  title: string;
  body: string;
  icon: typeof Sparkles;
  badge?: string;
};

const SOURCES: SourceOption[] = [
  {
    kind: 'sample',
    title: 'Sample API',
    body: 'A ready-made Reading List API. See the whole flow in about a minute.',
    icon: Sparkles,
    badge: 'Recommended',
  },
  {
    kind: 'spec',
    title: 'OpenAPI spec',
    body: 'Paste a link to your OpenAPI or Swagger file.',
    icon: FileCode2,
  },
  {
    kind: 'backend',
    title: 'Backend URL',
    body: 'Proxy an existing service. Add operations later.',
    icon: Globe,
  },
];

const METHOD_COLOR: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  GET: 'info',
  POST: 'success',
  PUT: 'warning',
  PATCH: 'warning',
  DELETE: 'error',
};

export function DefineStep({
  project,
  onCreated,
  variant = 'page',
  onCancel,
}: {
  project?: Project;
  onCreated: (ids: { apiId: string; projectId: string }) => void;
  /** `modal`: the in-product popover — no step header, footer actions. */
  variant?: 'page' | 'modal';
  onCancel?: () => void;
}) {
  const [kind, setKind] = useState<SourceKind>('sample');
  const [name, setName] = useState('Reading List');
  const [backendUrl, setBackendUrl] = useState(SAMPLE_BACKEND_URL);
  const [specUrl, setSpecUrl] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [moreOpen, setMoreOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [importedSpec, setImportedSpec] = useState<{ url: string; content: string }>();

  const createProject = useCreateProject();
  const importOpenApi = useImportOpenApi({ handlesErrors: true });
  const validateSpec = useValidateOpenApiSpec();

  const handle = toHandle(name) || 'my-api';
  const context = toContext(handle, version);

  const operations: PreviewOperation[] = useMemo(() => {
    if (kind === 'sample') return operationsOf(sampleSpec);
    if (kind === 'backend') return operationsOf(passthroughSpec(name, backendUrl));
    if (importedSpec) {
      try {
        return operationsOf(JSON.parse(importedSpec.content));
      } catch {
        return [];
      }
    }
    return [];
  }, [kind, name, backendUrl, importedSpec]);

  const selectSource = (next: SourceKind) => {
    setKind(next);
    setError(undefined);
    if (next === 'sample') {
      setName('Reading List');
      setBackendUrl(SAMPLE_BACKEND_URL);
    } else if (next === 'backend' && backendUrl === SAMPLE_BACKEND_URL) {
      setName('');
      setBackendUrl('');
    } else if (next === 'spec') {
      setName('');
    }
  };

  const loadSpec = () => {
    setError(undefined);
    validateSpec.mutate(
      { url: specUrl.trim() },
      {
        onSuccess: (result) => {
          if (!result.isValid || !result.content) {
            setError(result.errors[0]?.message ?? 'That file isn’t a valid OpenAPI document.');
            return;
          }
          setImportedSpec({ url: specUrl.trim(), content: result.content });
          if (!name && result.info?.title) setName(result.info.title);
          if (result.info?.version) setVersion(result.info.version);
        },
        onError: () => setError('We couldn’t fetch that URL. Check it’s public and try again.'),
      },
    );
  };

  const ensureProject = async (): Promise<string> => {
    if (project) return project.id;
    const created = await createProject.mutateAsync({
      id: 'default',
      displayName: 'Default project',
    } as Parameters<typeof createProject.mutateAsync>[0]);
    return created.id;
  };

  const create = async () => {
    setError(undefined);
    const file =
      kind === 'sample'
        ? specFile(sampleSpec)
        : kind === 'backend'
          ? specFile(passthroughSpec(name, backendUrl))
          : importedSpec
            ? specFile(importedSpec.content)
            : undefined;
    if (!file) {
      setError('Load your spec first.');
      return;
    }
    try {
      const projectId = await ensureProject();
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('id', handle);
      formData.append('displayName', name.trim());
      formData.append('version', version.trim());
      formData.append('context', context);
      formData.append('projectId', projectId);
      if (kind !== 'spec') {
        formData.append('upstream', JSON.stringify({ main: { url: backendUrl.trim() } }));
      }
      const api = await importOpenApi.mutateAsync(formData);
      demoStore.setActivation({ apiId: api.id, projectId });
      onCreated({ apiId: api.id ?? handle, projectId });
    } catch (cause) {
      const message = (cause as { message?: string })?.message;
      setError(message ?? 'Something went wrong creating the API.');
    }
  };

  const busy = createProject.isPending || importOpenApi.isPending;
  const canCreate =
    name.trim() !== '' &&
    (kind === 'spec' ? Boolean(importedSpec) : /^https?:\/\//.test(backendUrl.trim()));

  const actions = (
    <Stack
      direction="row"
      spacing={1}
      sx={{ justifyContent: variant === 'modal' ? 'flex-end' : 'flex-start' }}
    >
      {onCancel && (
        <Button onClick={onCancel} variant="text">
          Cancel
        </Button>
      )}
      <Button
        disabled={!canCreate || busy}
        onClick={create}
        size={variant === 'modal' ? 'medium' : 'large'}
        startIcon={busy ? <CircularProgress color="inherit" size={16} /> : undefined}
        variant="contained"
      >
        {busy ? 'Creating…' : 'Create API'}
      </Button>
    </Stack>
  );

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={5} sx={{ alignItems: 'flex-start' }}>
        <Stack spacing={3} sx={{ flex: 1, minWidth: 0, maxWidth: 620 }}>
          {variant === 'page' ? (
            <StepHeader
              eyebrow="Step 1"
              title="What should your API connect to?"
              subtitle="Pick a starting point. You can change everything later."
            />
          ) : (
            <Typography color="text.secondary" variant="body2">
              Pick a starting point. You can change everything later.
            </Typography>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            {SOURCES.map((source) => {
              const selected = source.kind === kind;
              const Icon = source.icon;
              return (
                <ButtonBase
                  aria-pressed={selected}
                  key={source.kind}
                  onClick={() => selectSource(source.kind)}
                  sx={(theme) => ({
                    alignItems: 'flex-start',
                    border: 1,
                    borderColor: selected ? 'primary.main' : 'divider',
                    borderRadius: 1.5,
                    bgcolor: selected ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                    display: 'flex',
                    flex: 1,
                    flexDirection: 'column',
                    gap: 1,
                    p: 2,
                    textAlign: 'left',
                    transition: 'border-color 120ms, background-color 120ms',
                    '&:hover': { borderColor: selected ? 'primary.main' : 'text.secondary' },
                  })}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
                    <Icon size={18} />
                    <Typography sx={{ fontWeight: 600 }} variant="body2">
                      {source.title}
                    </Typography>
                    {source.badge && (
                      <Chip label={source.badge} size="small" sx={{ ml: 'auto', height: 20 }} />
                    )}
                  </Stack>
                  <Typography color="text.secondary" variant="caption">
                    {source.body}
                  </Typography>
                </ButtonBase>
              );
            })}
          </Stack>

          <Stack spacing={2}>
            {kind === 'spec' && (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  label="Spec URL"
                  onChange={(event) => {
                    setSpecUrl(event.target.value);
                    setImportedSpec(undefined);
                  }}
                  placeholder="https://example.com/openapi.yaml"
                  size="small"
                  value={specUrl}
                />
                <Button
                  disabled={!/^https?:\/\//.test(specUrl.trim()) || validateSpec.isPending}
                  onClick={loadSpec}
                  sx={{ flexShrink: 0, height: 40 }}
                  variant="outlined"
                >
                  {validateSpec.isPending ? <CircularProgress size={16} /> : 'Load'}
                </Button>
              </Stack>
            )}

            <TextField
              fullWidth
              label="API name"
              onChange={(event) => setName(event.target.value)}
              size="small"
              value={name}
            />

            {kind !== 'spec' && (
              <TextField
                fullWidth
                helperText={
                  kind === 'sample'
                    ? 'A public sample service. Read-only requests are safe to try.'
                    : 'The service your gateway will forward requests to.'
                }
                label="Backend URL"
                onChange={(event) => setBackendUrl(event.target.value)}
                placeholder="https://api.example.com"
                size="small"
                value={backendUrl}
              />
            )}

            <Box>
              <Button
                endIcon={moreOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                onClick={() => setMoreOpen((open) => !open)}
                size="small"
                variant="text"
              >
                More options
              </Button>
              <Collapse in={moreOpen}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1.5 }}>
                  <TextField
                    label="Version"
                    onChange={(event) => setVersion(event.target.value)}
                    size="small"
                    value={version}
                  />
                  <TextField disabled label="Path on the gateway" size="small" value={context} />
                  <TextField
                    disabled
                    label="Project"
                    size="small"
                    value={project?.displayName ?? 'Default project (created for you)'}
                  />
                </Stack>
              </Collapse>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>

          {variant === 'page' && actions}
        </Stack>

        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1.5,
            flex: { lg: variant === 'modal' ? 1 : '0 0 360px' },
            p: 2.5,
            width: { xs: '100%', lg: variant === 'modal' ? 'auto' : 360 },
          }}
        >
          <Typography
            color="text.secondary"
            sx={{ fontWeight: 600, letterSpacing: 0.4 }}
            variant="caption"
          >
            PREVIEW
          </Typography>
          <Typography sx={{ fontWeight: 600, mt: 1 }} variant="h6">
            {name.trim() || 'Your API'}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ fontFamily: 'monospace', mb: 2 }}
            variant="caption"
          >
            https://&lt;your-gateway&gt;{context}
          </Typography>
          <Stack spacing={0.75} sx={{ mt: 1.5 }}>
            {operations.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                Load a spec to see its operations.
              </Typography>
            )}
            {operations.slice(0, 8).map((operation) => (
              <Stack
                direction="row"
                key={`${operation.method} ${operation.path}`}
                spacing={1}
                sx={{ alignItems: 'center' }}
              >
                <Chip
                  color={METHOD_COLOR[operation.method] ?? 'default'}
                  label={operation.method}
                  size="small"
                  sx={{ fontFamily: 'monospace', fontSize: 11, height: 20, minWidth: 58 }}
                  variant="outlined"
                />
                <Typography sx={{ fontFamily: 'monospace' }} variant="body2">
                  {operation.path}
                </Typography>
              </Stack>
            ))}
            {operations.length > 8 && (
              <Typography color="text.secondary" variant="caption">
                +{operations.length - 8} more
              </Typography>
            )}
          </Stack>
          {kind === 'backend' && (
            <Typography color="text.secondary" sx={{ display: 'block', mt: 2 }} variant="caption">
              Starts read-only (GET on every path). Add write operations and security when you’re
              ready.
            </Typography>
          )}
        </Box>
      </Stack>
      {variant === 'modal' && (
        <Box sx={{ borderColor: 'divider', borderTop: 1, mb: -3, mx: -3, px: 3, py: 2 }}>
          {actions}
        </Box>
      )}
    </Stack>
  );
}
