/**
 * hooks.ts - Hooks personalizados de Redux con TypeScript
 * 
 * Proporciona hooks tipados para usar con Redux en TypeScript
 */

import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

// Hooks tipados para usar en toda la aplicación
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

