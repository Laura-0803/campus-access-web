package edu.hfut.campus.config;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import javax.annotation.PostConstruct;
import javax.sql.DataSource;
import java.sql.*;
@Component public class IsolationGuard  {
  private final DataSource ds;
  @Value("${server.address}")String address;
  @Value("${P2_INTERNAL_KEY}")String key;
  @Value("${spring.datasource.url}")String url;
  public IsolationGuard(DataSource d)  {
    ds=d;
  }
  @PostConstruct public void verify()throws Exception  {
    if(!"127.0.0.1".equals(address)||key.length()<32)throw new IllegalStateException("Loopback and service credential required");
    if(!url.matches("jdbc:mysql://127\\.0\\.0\\.1:[0-9]+/campus_p2_user_[0-9]{14}\\?.*"))throw new IllegalStateException("Isolated loopback JDBC URL required");
    try(Connection c=ds.getConnection())  {
      String db=c.getCatalog();
      if(!db.matches("campus_p2_user_[0-9]{14}"))throw new IllegalStateException("Isolated schema required");
      try(Statement s=c.createStatement();ResultSet r=s.executeQuery("SHOW GRANTS"))  {
        while(r.next())  {
          String g=r.getString(1);
          if(g.startsWith("GRANT ALL")||g.contains(" ON *.*")&&!g.startsWith("GRANT USAGE")||g.contains(" ON `")&&!g.contains("`"+db+"`.*"))throw new IllegalStateException("Account is not isolated");
        }
      }
    }
  }
}
