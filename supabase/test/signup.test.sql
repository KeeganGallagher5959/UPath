BEGIN;
SELECT plan(5);

SELECT lives_ok(
    $$ 
    INSERT INTO auth.users (id, email) 
    VALUES ('00000000-0000-0000-0000-000000000001', 'testuser1@umass.edu')
    $$,
    'UMass email can be created.'
);

SELECT is(
    (
        SELECT count(*)::int from profiles
        WHERE id = '00000000-0000-0000-0000-000000000001'
    ),
    1,
    'one profile created for each signup'
);

SELECT is(
    (
        SELECT username from profiles
        WHERE id = '00000000-0000-0000-0000-000000000001'
    ),
    'testuser1',
    'Username is spliced from email.'
);

SELECT throws_ok(
    $$
    INSERT INTO auth.users (id, email)
    VALUES ('00000000-0000-0000-0000-000000000002', 'testuser2@gmail.com')
    $$,
    'Only UMass email address are allowed'
);

SELECT throws_ok(
    $$
    INSERT INTO auth.users (id, email)
    VALUES ('00000000-0000-0000-0000-000000000002', 'testuser3@umass.edu.sth.com')
    $$,
    'Only UMass email address are allowed'
);

SELECT * FROM finish();
ROLLBACK;