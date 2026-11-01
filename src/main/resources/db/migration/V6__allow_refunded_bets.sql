-- Allow REFUNDED as a valid bet status.

DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class tbl ON tbl.oid = con.conrelid
        WHERE tbl.relname = 'bets'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%status%'
    LOOP
        EXECUTE format(
            'ALTER TABLE bets DROP CONSTRAINT %I',
            constraint_record.conname
        );
    END LOOP;
END $$;

ALTER TABLE bets
ADD CONSTRAINT bets_status_check
CHECK (status IN ('PENDING', 'WON', 'LOST', 'REFUNDED'));