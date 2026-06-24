#!/usr/bin/env node

import { runMain } from 'citty'
import { main } from '../lib/cli/main.js'

await runMain(main)