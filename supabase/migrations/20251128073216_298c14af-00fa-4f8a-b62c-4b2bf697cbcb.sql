-- Add trigger to auto-update updated_at on market_data
CREATE OR REPLACE FUNCTION update_market_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER market_data_updated_at
  BEFORE UPDATE ON market_data
  FOR EACH ROW
  EXECUTE FUNCTION update_market_data_updated_at();