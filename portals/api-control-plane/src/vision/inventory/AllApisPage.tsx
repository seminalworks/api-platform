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
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Typography,
} from '@wso2/oxygen-ui';
import { Plus, X } from '@wso2/oxygen-ui-icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import { AppPage } from '@/components/AppPage';
import { useProjects, type Project } from '@/api/resources/projects';
import { useAllRestApis } from '@/api/resources/restApis';
import { routes } from '@/routes/paths';
import { useDemoState } from '../demo/demoStore';
import { DefineStep } from '../activation/steps/DefineStep';

/**
 * Vision: every API in the organization in one inventory. Projects filter the
 * list instead of being a layer you have to enter before anything shows.
 */
export function AllApisPage() {
  const { orgHandle = '' } = useParams();
  const navigate = useNavigate();
  const demo = useDemoState();
  const projectsQuery = useProjects();
  const projects = projectsQuery.data?.list ?? [];
  const [filter, setFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const visible = filter === 'all' ? projects : projects.filter((project) => project.id === filter);

  const create = () => {
    if (demo.wizardVariant === 'modal') setModalOpen(true);
    else navigate(`${routes.getStarted(orgHandle)}?step=define`);
  };

  return (
    <AppPage hideBreadcrumbs>
      <Stack spacing={3}>
        <Stack direction="row" sx={{ alignItems: 'flex-end' }}>
          <Box sx={{ flex: 1 }}>
            <Typography component="h1" sx={{ fontWeight: 700 }} variant="h4">
              APIs
            </Typography>
            <Typography color="text.secondary">Every API in your organization.</Typography>
          </Box>
          <Button onClick={create} startIcon={<Plus size={16} />} variant="contained">
            Create API
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Chip
            color={filter === 'all' ? 'primary' : 'default'}
            label="All projects"
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'filled' : 'outlined'}
          />
          {projects.map((project) => (
            <Chip
              color={filter === project.id ? 'primary' : 'default'}
              key={project.id}
              label={project.displayName}
              onClick={() => setFilter(project.id)}
              variant={filter === project.id ? 'filled' : 'outlined'}
            />
          ))}
        </Stack>

        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
          <Stack
            direction="row"
            sx={{ bgcolor: 'action.hover', color: 'text.secondary', px: 2, py: 1, typography: 'caption', fontWeight: 600 }}
          >
            <Box sx={{ flex: 3 }}>Name</Box>
            <Box sx={{ flex: 2 }}>Project</Box>
            <Box sx={{ flex: 1 }}>Version</Box>
            <Box sx={{ flex: 2 }}>Path</Box>
          </Stack>
          {visible.map((project) => (
            <ProjectRows key={project.id} orgHandle={orgHandle} project={project} />
          ))}
          {projects.length === 0 && !projectsQuery.isPending && (
            <Stack spacing={1.5} sx={{ alignItems: 'center', p: 6 }}>
              <Typography sx={{ fontWeight: 600 }}>No APIs yet</Typography>
              <Button onClick={create} variant="contained">
                Create your first API
              </Button>
            </Stack>
          )}
        </Box>
      </Stack>

      <Dialog fullWidth maxWidth="lg" onClose={() => setModalOpen(false)} open={modalOpen}>
        <IconButton
          aria-label="Close"
          onClick={() => setModalOpen(false)}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <X size={18} />
        </IconButton>
        <DialogContent sx={{ p: 4 }}>
          <DefineStep
            onCreated={({ apiId, projectId }) => {
              setModalOpen(false);
              navigate(routes.api(orgHandle, projectId, apiId));
            }}
            project={projects[0]}
          />
        </DialogContent>
      </Dialog>
    </AppPage>
  );
}

function ProjectRows({ orgHandle, project }: { orgHandle: string; project: Project }) {
  const navigate = useNavigate();
  const apisQuery = useAllRestApis({}, { projectId: project.id });
  const apis = apisQuery.data?.list ?? [];
  return (
    <>
      {apis.map((api) => (
        <Stack
          direction="row"
          key={api.id}
          onClick={() => api.id && navigate(routes.api(orgHandle, project.id, api.id))}
          sx={{
            alignItems: 'center',
            borderTop: 1,
            borderColor: 'divider',
            cursor: 'pointer',
            px: 2,
            py: 1.5,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Box sx={{ flex: 3, fontWeight: 600, typography: 'body2' }}>{api.displayName}</Box>
          <Box sx={{ color: 'text.secondary', flex: 2, typography: 'body2' }}>{project.displayName}</Box>
          <Box sx={{ flex: 1, typography: 'body2' }}>v{api.version}</Box>
          <Box sx={{ color: 'text.secondary', flex: 2, fontFamily: 'monospace', typography: 'body2' }}>
            {api.context}
          </Box>
        </Stack>
      ))}
    </>
  );
}
