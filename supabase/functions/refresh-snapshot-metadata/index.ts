import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the JWT token from the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`[REFRESH-METADATA] Refreshing snapshot metadata for user ${user.id}`);

    // Get the latest snapshot for this user
    const { data: latestSnapshot, error: snapshotError } = await supabase
      .from('snapshots')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (snapshotError) {
      console.error('[REFRESH-METADATA] Error fetching latest snapshot:', snapshotError);
      throw new Error('Aucun snapshot trouvé');
    }

    console.log(`[REFRESH-METADATA] Latest snapshot ID: ${latestSnapshot.id}`);

    // Get all snapshot lines for this snapshot
    const { data: snapshotLines, error: linesError } = await supabase
      .from('snapshot_lines')
      .select('id, security_id')
      .eq('snapshot_id', latestSnapshot.id);

    if (linesError) {
      console.error('[REFRESH-METADATA] Error fetching snapshot lines:', linesError);
      throw linesError;
    }

    if (!snapshotLines || snapshotLines.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Aucune ligne de snapshot à mettre à jour',
          snapshot_id: latestSnapshot.id,
          updated_lines: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[REFRESH-METADATA] Found ${snapshotLines.length} snapshot lines to update`);

    // Get all securities with their metadata
    const securityIds = snapshotLines.map(line => line.security_id);
    const { data: securities, error: securitiesError } = await supabase
      .from('securities')
      .select('id, region, sector, asset_class')
      .in('id', securityIds);

    if (securitiesError) {
      console.error('[REFRESH-METADATA] Error fetching securities:', securitiesError);
      throw securitiesError;
    }

    // Create a map of security_id to metadata
    const securityMap = new Map<string, { region: string | null; sector: string | null; asset_class: string | null }>();
    securities?.forEach(sec => {
      securityMap.set(sec.id, { 
        region: sec.region, 
        sector: sec.sector,
        asset_class: sec.asset_class 
      });
    });

    // Update each snapshot line - only copy if security has actual data (not just placeholders)
    let updatedCount = 0;
    let skippedCount = 0;

    for (const line of snapshotLines) {
      const metadata = securityMap.get(line.security_id);
      
      if (metadata) {
        // Only update if we have real classified data, not placeholders
        const hasRealRegion = metadata.region && metadata.region !== 'Non classifié' && metadata.region !== 'Non défini';
        const hasRealSector = metadata.sector && metadata.sector !== 'Non classifié';
        
        if (hasRealRegion || hasRealSector) {
          const updateData: Record<string, any> = {};
          
          // Only set fields that have real values
          if (hasRealRegion) {
            updateData.region = metadata.region;
          }
          if (hasRealSector) {
            updateData.sector = metadata.sector;
          }
          if (metadata.asset_class) {
            updateData.asset_class = metadata.asset_class;
          }
          
          const { error: updateError } = await supabase
            .from('snapshot_lines')
            .update(updateData)
            .eq('id', line.id);

          if (!updateError) {
            updatedCount++;
          } else {
            console.error(`[REFRESH-METADATA] Error updating line ${line.id}:`, updateError);
          }
        } else {
          // Security has no good classification - leave snapshot_line as-is
          // The frontend hook will try to enrich it locally
          console.log(`[REFRESH-METADATA] Skipping line ${line.id}: security has placeholder values`);
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    console.log(`[REFRESH-METADATA] Updated ${updatedCount} lines, skipped ${skippedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Métadonnées mises à jour pour ${updatedCount} positions (${skippedCount} sans classification)`,
        snapshot_id: latestSnapshot.id,
        updated_lines: updatedCount,
        skipped_lines: skippedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[REFRESH-METADATA] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
