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

import readingListSpec from '@/pages/appShell/appShellPages/test/curl/utils/readingListApi.fixture.json';
import { DEFAULT_API_SKELETON } from '@/pages/appShell/appShellPages/apis/create/utils/apiSkeleton';

export type SourceKind = 'sample' | 'spec' | 'backend';

export const SAMPLE_BACKEND_URL = 'https://apis.bijira.dev/samples/reading-list-api-service/v1.0';

/** One operation shown in the preview, and the path the first call uses. */
export type PreviewOperation = { method: string; path: string; summary?: string };

type OpenApiDoc = {
  info?: { title?: string; version?: string };
  servers?: { url?: string }[];
  paths?: Record<string, Record<string, { summary?: string }>>;
};

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

export const operationsOf = (doc: OpenApiDoc | undefined): PreviewOperation[] =>
  Object.entries(doc?.paths ?? {}).flatMap(([path, item]) =>
    Object.entries(item)
      .filter(([method]) => HTTP_METHODS.includes(method))
      .map(([method, operation]) => ({
        method: method.toUpperCase(),
        path,
        summary: operation?.summary,
      })),
  );

export const sampleSpec = readingListSpec as OpenApiDoc;

/** A passthrough definition for "start from your backend URL": read-only by default. */
export const passthroughSpec = (title: string, backendUrl: string): OpenApiDoc => {
  const skeleton = DEFAULT_API_SKELETON as OpenApiDoc;
  const wildcard = skeleton.paths?.['/*'] ?? {};
  return {
    ...skeleton,
    info: { ...skeleton.info, title, version: '1.0.0' },
    servers: [{ url: backendUrl }],
    // Only GET until the user opts into writes: a first API shouldn't ship
    // unauthenticated POST/PATCH/DELETE on every path.
    paths: { '/*': { get: wildcard.get ?? { summary: 'Get Resource' } } },
  };
};

export const toHandle = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

export const toContext = (handle: string, version: string) => {
  const major = version.trim().split('.')[0] || '1';
  return `/${handle}/v${major}`;
};

/** The first GET with no path parameters: what a "first call" should hit. */
export const firstCallPath = (operations: PreviewOperation[]): string => {
  const candidate = operations.find(
    (operation) => operation.method === 'GET' && !operation.path.includes('{'),
  );
  if (!candidate || candidate.path === '/*') return '/';
  return candidate.path;
};

export const specFile = (doc: OpenApiDoc | string, name = 'openapi.json') =>
  new File([typeof doc === 'string' ? doc : JSON.stringify(doc, null, 2)], name, {
    type: 'application/json',
  });
