package org.streampipes.pe.processors.esper.debs.c2;

import com.espertech.esper.event.map.MapEventBean;
import com.google.gson.Gson;
import org.streampipes.pe.processors.esper.debs.c1.DebsOutputParameters;
import org.streampipes.wrapper.esper.writer.Writer;

public class Challenge2FileWriter implements Writer {

	private DebsOutputParameters outputParams;
	private boolean persist;
	private Gson gson;
	
	public Challenge2FileWriter(DebsOutputParameters outputParams, boolean persist) {
		this.outputParams = outputParams;
		this.persist = persist;
		prepare();
	}
	
	public void prepare()
	{
		gson = new Gson();
	}
	
	@Override
	public void onEvent(MapEventBean bean) {
		//gson.toJson(bean.getUnderlying());
		//System.out.println(gson.toJson(bean.getUnderlying()));
	}

}
