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

import { Box, Chip, Stack, Tab, Tabs, Typography } from '@wso2/oxygen-ui';
import { ChevronRight } from '@wso2/oxygen-ui-icons-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useProject } from '@/api/resources/projects';
import { useRestApi } from '@/api/resources/restApis';
import { routes } from '@/routes/paths';

type TabDef = { label: string; to: string };

/**
 * Vision: an API's work lives on the API, as tabs (the industry pattern),
 * instead of as first-class sidebar destinations that need an API picked first.
 */
export function ApiTabs({
  orgHandle,
  projectHandler,
  apiHandler,
}: {
  orgHandle: string;
  projectHandler: string;
  apiHandler: string;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const apiQuery = useRestApi(apiHandler);
  const projectQuery = useProject(projectHandler);

  const tabs: TabDef[] = [
    { label: 'Overview', to: routes.api(orgHandle, projectHandler, apiHandler) },
    { label: 'Policies', to: routes.apiDevelopPolicies(orgHandle, projectHandler, apiHandler) },
    { label: 'Definition', to: routes.apiDevelopDefinition(orgHandle, projectHandler, apiHandler) },
    { label: 'Deploy', to: routes.apiDeploy(orgHandle, projectHandler, apiHandler) },
    { label: 'Test', to: routes.apiTest(orgHandle, projectHandler, apiHandler) },
    { label: 'Publish', to: routes.apiPortals(orgHandle, projectHandler, apiHandler) },
    { label: 'Insights', to: routes.apiInsightsApi(orgHandle, projectHandler, apiHandler) },
    { label: 'Logs', to: routes.apiObservabilityLogs(orgHandle, projectHandler, apiHandler) },
  ];

  const active = tabs.findIndex((tab, index) =>
    index === 0 ? pathname === tab.to : pathname.startsWith(tab.to),
  );
  // Edit and other sub-pages of the API have no tab of their own.
  if (active === -1 && !pathname.startsWith(tabs[0].to)) return null;

  const api = apiQuery.data;

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, px: { xs: 1, md: 3 }, pt: 2 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.5 }}>
        <Typography
          color="text.secondary"
          component={Link}
          sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          to={routes.allApis(orgHandle)}
          variant="body2"
        >
          APIs
        </Typography>
        <ChevronRight size={14} />
        <Typography color="text.secondary" variant="body2">
          {projectQuery.data?.displayName ?? projectHandler}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Typography component="h1" sx={{ fontWeight: 700 }} variant="h5">
          {api?.displayName ?? apiHandler}
        </Typography>
        {api?.version && <Chip label={`v${api.version}`} size="small" variant="outlined" />}
        {api?.kind && (
          <Chip
            label={api.kind === 'RestApi' ? 'REST' : api.kind}
            size="small"
            variant="outlined"
          />
        )}
      </Stack>
      <Tabs
        onChange={(_, index: number) => navigate(tabs[index].to)}
        sx={{ minHeight: 40, mt: 1 }}
        value={active === -1 ? false : active}
        variant="scrollable"
      >
        {tabs.map((tab) => (
          <Tab key={tab.label} label={tab.label} sx={{ minHeight: 40 }} />
        ))}
      </Tabs>
    </Box>
  );
}
