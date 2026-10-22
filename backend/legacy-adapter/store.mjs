// Per-request projection, never a shared legacy process cache. Only legacy-owned rows persist here.
import {AsyncLocalStorage} from 'node:async_hooks';
export const scope=new AsyncLocalStorage();
export function getData(){const s=scope.getStore();if(!s)throw Error('No request projection');return s.data;}
export async function updateData(mutator){const s=scope.getStore(),draft=structuredClone(s.data),result=await mutator(draft);await s.persist(s.data,draft);s.data=draft;return result??draft;}
