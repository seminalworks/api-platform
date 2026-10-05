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

import { useProjects } from '@/api/resources/projects';
import { useAllRestApis } from '@/api/resources/restApis';
import { useDeployments } from '@/api/resources/restApis/deployments';
import { useGateways } from '@/api/resources/gateways';
import { useDemoState } from '../demo/demoStore';

export type ActivationStepKey = 'define' | 'gateway' | 'deploy' | 'call';

export type ActivationStep = {
  key: ActivationStepKey;
  label: string;
  hint: string;
  complete: boolean;
};

/**
 * The one throughline for first-run activation, derived from real data so the
 * setup guide and the takeover always agree with what the console shows:
 * an API exists → a gateway is connected → the API is deployed to it → the
 * user has made a successful first call (self-reported, or staged in demo).
 */
export const useActivation = () => {
  const demo = useDemoState();
  const record = demo.activation;

  const projectsQuery = useProjects();
  const projects = projectsQuery.data?.list ?? [];
  const project = projects.find((candidate) => candidate.id === record.projectId) ?? projects[0];

  const apisQuery = useAllRestApis({}, { projectId: project?.id });
  const apis = apisQuery.data?.list ?? [];
  const api = apis.find((candidate) => candidate.id === record.apiId) ?? apis[0];

  const gatewaysQuery = useGateways();
  const gateways = gatewaysQuery.data?.list ?? [];
  const connectedGateways = gateways.filter((gateway) => gateway.isActive === true);
  const gateway =
    gateways.find((candidate) => candidate.id === record.gatewayId) ?? connectedGateways[0];

  const deploymentsQuery = useDeployments(api?.id);
  const deployments = deploymentsQuery.data?.list ?? [];
  const liveDeployment = deployments.find(
    (deployment) =>
      deployment.status === 'DEPLOYED' && (!gateway || deployment.gatewayId === gateway.id),
  );

  const steps: ActivationStep[] = [
    {
      key: 'define',
      label: 'Define your API',
      hint: 'Point us at a backend or a spec',
      complete: Boolean(api),
    },
    {
      key: 'gateway',
      label: 'Connect a gateway',
      hint: 'Where your API will run',
      complete: Boolean(gateway?.isActive) || demo.scenarios.gateway === 'success',
    },
    {
      key: 'deploy',
      label: 'Deploy',
      hint: 'Put your API on the gateway',
      complete: Boolean(liveDeployment) || demo.scenarios.deploy === 'success',
    },
    {
      key: 'call',
      label: 'Make your first call',
      hint: 'See a real response',
      complete: Boolean(record.firstCallConfirmed),
    },
  ];

  const completed = steps.filter((step) => step.complete).length;
  const nextStep = steps.find((step) => !step.complete);

  return {
    project,
    projects,
    api,
    apis,
    gateway,
    gateways,
    connectedGateways,
    liveDeployment,
    steps,
    completed,
    total: steps.length,
    nextStep,
    isLoading: projectsQuery.isPending || gatewaysQuery.isPending,
    gatewaysLoaded: gatewaysQuery.isSuccess,
    refetchGateways: gatewaysQuery.refetch,
  };
};
