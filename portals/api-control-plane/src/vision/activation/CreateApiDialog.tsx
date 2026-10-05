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

import { Dialog, DialogContent, DialogTitle, IconButton } from '@wso2/oxygen-ui';
import { X } from '@wso2/oxygen-ui-icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import { useProjects } from '@/api/resources/projects';
import { routes } from '@/routes/paths';
import { DefineStep } from './steps/DefineStep';

/**
 * Vision: the in-product create flow is a focused popover (Kong's pattern):
 * one decision screen, then you land on the new API's own page, where the
 * rest of activation lives.
 */
export function CreateApiDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { orgHandle = '' } = useParams();
  const navigate = useNavigate();
  const projectsQuery = useProjects();
  const project = projectsQuery.data?.list?.[0];

  return (
    <Dialog fullWidth maxWidth="lg" onClose={onClose} open={open}>
      <DialogTitle sx={{ fontWeight: 700, pr: 6 }}>Create an API</DialogTitle>
      <IconButton aria-label="Close" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
        <X size={18} />
      </IconButton>
      <DialogContent dividers sx={{ p: 3 }}>
        <DefineStep
          onCancel={onClose}
          onCreated={({ apiId, projectId }) => {
            onClose();
            navigate(routes.api(orgHandle, projectId, apiId));
          }}
          project={project}
          variant="modal"
        />
      </DialogContent>
    </Dialog>
  );
}
