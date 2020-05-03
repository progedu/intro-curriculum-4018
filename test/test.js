
 const createdSchedulePath = res.headers.location;
           request(app)
             .get(createdSchedulePath)
-            // TODO 作成された予定と候補が表示されていることをテストする
+            .expect(/テスト予定1/)
+            .expect(/テストメモ1/)
+            .expect(/テストメモ2/)
+            .expect(/テスト候補1/)
+            .expect(/テスト候補2/)
+            .expect(/テスト候補3/)
             .expect(200)
             .end((err, res) => {
               // テストで作成したデータを削除
