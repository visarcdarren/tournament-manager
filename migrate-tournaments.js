// Migration script to update existing tournaments to the new format
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { migrateTournamentToV2 } from './server/scheduleGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'server', 'data');

async function migrateTournaments() {
  try {
    const files = await fs.readdir(DATA_DIR);
    let migrated = 0;
    
    for (const file of files) {
      if (file.endsWith('.json') && !file.includes('-audit')) {
        try {
          const filePath = path.join(DATA_DIR, file);
          const data = await fs.readFile(filePath, 'utf8');
          const tournament = JSON.parse(data);
          
          // Check if migration is needed
          if (!tournament.creatorDeviceId && tournament.adminDeviceId) {
            console.log(`Migrating tournament: ${tournament.name} (${tournament.id})`);
            
            const migratedTournament = migrateTournamentToV2(tournament);
            await fs.writeFile(filePath, JSON.stringify(migratedTournament, null, 2));
            
            migrated++;
            console.log(`✓ Migrated ${tournament.name}`);
          } else {
            console.log(`✓ ${tournament.name} already migrated`);
          }
        } catch (fileError) {
          console.error(`Error processing ${file}:`, fileError);
        }
      }
    }
    
    console.log(`\nMigration complete! ${migrated} tournaments migrated.`);
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run migration
migrateTournaments();
