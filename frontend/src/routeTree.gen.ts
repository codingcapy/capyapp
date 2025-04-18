/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as DashboardImport } from './routes/dashboard'
import { Route as HeaderImport } from './routes/_header'
import { Route as IndexImport } from './routes/index'
import { Route as HeaderSignupImport } from './routes/_header.signup'
import { Route as HeaderResetImport } from './routes/_header.reset'
import { Route as HeaderLoginImport } from './routes/_header.login'
import { Route as HeaderContactImport } from './routes/_header.contact'
import { Route as HeaderAboutImport } from './routes/_header.about'

// Create/Update Routes

const DashboardRoute = DashboardImport.update({
  id: '/dashboard',
  path: '/dashboard',
  getParentRoute: () => rootRoute,
} as any)

const HeaderRoute = HeaderImport.update({
  id: '/_header',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const HeaderSignupRoute = HeaderSignupImport.update({
  id: '/signup',
  path: '/signup',
  getParentRoute: () => HeaderRoute,
} as any)

const HeaderResetRoute = HeaderResetImport.update({
  id: '/reset',
  path: '/reset',
  getParentRoute: () => HeaderRoute,
} as any)

const HeaderLoginRoute = HeaderLoginImport.update({
  id: '/login',
  path: '/login',
  getParentRoute: () => HeaderRoute,
} as any)

const HeaderContactRoute = HeaderContactImport.update({
  id: '/contact',
  path: '/contact',
  getParentRoute: () => HeaderRoute,
} as any)

const HeaderAboutRoute = HeaderAboutImport.update({
  id: '/about',
  path: '/about',
  getParentRoute: () => HeaderRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/_header': {
      id: '/_header'
      path: ''
      fullPath: ''
      preLoaderRoute: typeof HeaderImport
      parentRoute: typeof rootRoute
    }
    '/dashboard': {
      id: '/dashboard'
      path: '/dashboard'
      fullPath: '/dashboard'
      preLoaderRoute: typeof DashboardImport
      parentRoute: typeof rootRoute
    }
    '/_header/about': {
      id: '/_header/about'
      path: '/about'
      fullPath: '/about'
      preLoaderRoute: typeof HeaderAboutImport
      parentRoute: typeof HeaderImport
    }
    '/_header/contact': {
      id: '/_header/contact'
      path: '/contact'
      fullPath: '/contact'
      preLoaderRoute: typeof HeaderContactImport
      parentRoute: typeof HeaderImport
    }
    '/_header/login': {
      id: '/_header/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof HeaderLoginImport
      parentRoute: typeof HeaderImport
    }
    '/_header/reset': {
      id: '/_header/reset'
      path: '/reset'
      fullPath: '/reset'
      preLoaderRoute: typeof HeaderResetImport
      parentRoute: typeof HeaderImport
    }
    '/_header/signup': {
      id: '/_header/signup'
      path: '/signup'
      fullPath: '/signup'
      preLoaderRoute: typeof HeaderSignupImport
      parentRoute: typeof HeaderImport
    }
  }
}

// Create and export the route tree

interface HeaderRouteChildren {
  HeaderAboutRoute: typeof HeaderAboutRoute
  HeaderContactRoute: typeof HeaderContactRoute
  HeaderLoginRoute: typeof HeaderLoginRoute
  HeaderResetRoute: typeof HeaderResetRoute
  HeaderSignupRoute: typeof HeaderSignupRoute
}

const HeaderRouteChildren: HeaderRouteChildren = {
  HeaderAboutRoute: HeaderAboutRoute,
  HeaderContactRoute: HeaderContactRoute,
  HeaderLoginRoute: HeaderLoginRoute,
  HeaderResetRoute: HeaderResetRoute,
  HeaderSignupRoute: HeaderSignupRoute,
}

const HeaderRouteWithChildren =
  HeaderRoute._addFileChildren(HeaderRouteChildren)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '': typeof HeaderRouteWithChildren
  '/dashboard': typeof DashboardRoute
  '/about': typeof HeaderAboutRoute
  '/contact': typeof HeaderContactRoute
  '/login': typeof HeaderLoginRoute
  '/reset': typeof HeaderResetRoute
  '/signup': typeof HeaderSignupRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '': typeof HeaderRouteWithChildren
  '/dashboard': typeof DashboardRoute
  '/about': typeof HeaderAboutRoute
  '/contact': typeof HeaderContactRoute
  '/login': typeof HeaderLoginRoute
  '/reset': typeof HeaderResetRoute
  '/signup': typeof HeaderSignupRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/_header': typeof HeaderRouteWithChildren
  '/dashboard': typeof DashboardRoute
  '/_header/about': typeof HeaderAboutRoute
  '/_header/contact': typeof HeaderContactRoute
  '/_header/login': typeof HeaderLoginRoute
  '/_header/reset': typeof HeaderResetRoute
  '/_header/signup': typeof HeaderSignupRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | ''
    | '/dashboard'
    | '/about'
    | '/contact'
    | '/login'
    | '/reset'
    | '/signup'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | ''
    | '/dashboard'
    | '/about'
    | '/contact'
    | '/login'
    | '/reset'
    | '/signup'
  id:
    | '__root__'
    | '/'
    | '/_header'
    | '/dashboard'
    | '/_header/about'
    | '/_header/contact'
    | '/_header/login'
    | '/_header/reset'
    | '/_header/signup'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  HeaderRoute: typeof HeaderRouteWithChildren
  DashboardRoute: typeof DashboardRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  HeaderRoute: HeaderRouteWithChildren,
  DashboardRoute: DashboardRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/_header",
        "/dashboard"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/_header": {
      "filePath": "_header.tsx",
      "children": [
        "/_header/about",
        "/_header/contact",
        "/_header/login",
        "/_header/reset",
        "/_header/signup"
      ]
    },
    "/dashboard": {
      "filePath": "dashboard.tsx"
    },
    "/_header/about": {
      "filePath": "_header.about.tsx",
      "parent": "/_header"
    },
    "/_header/contact": {
      "filePath": "_header.contact.tsx",
      "parent": "/_header"
    },
    "/_header/login": {
      "filePath": "_header.login.tsx",
      "parent": "/_header"
    },
    "/_header/reset": {
      "filePath": "_header.reset.tsx",
      "parent": "/_header"
    },
    "/_header/signup": {
      "filePath": "_header.signup.tsx",
      "parent": "/_header"
    }
  }
}
ROUTE_MANIFEST_END */
