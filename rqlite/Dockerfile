FROM rqlite/rqlite:8.37.0

ENTRYPOINT ["rqlited", "-http-addr", "0.0.0.0:4001", "-http-adv-addr", "localhost:4001", "-raft-addr", "0.0.0.0:4002", "-raft-adv-addr", "localhost:4002", "/data"]